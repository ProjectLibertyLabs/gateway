import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import {
  ConnectionType,
  ImportBundleBuilder,
  ConnectAction,
  DsnpKeys,
  DisconnectAction,
  Action,
  PrivacyType,
} from '@dsnp/graph-sdk';
import { MessageSourceId } from '@frequency-chain/api-augment/interfaces';
import { AnyNumber } from '@polkadot/types/types';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { BaseConsumer } from '#consumer';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';
import fs from 'fs';
import { BlockchainService } from '#blockchain/blockchain.service';
import { GraphUpdateJob, ConnectionDto, Direction } from '#types/dtos/graph';
import { ProviderGraphUpdateJob } from '#types/interfaces/graph';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { LAST_PROCESSED_DSNP_ID_KEY, SECONDS_PER_BLOCK } from '#types/constants';
import { EncryptionService } from '#graph-lib/services/encryption.service';

@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE)
export class RequestProcessorService extends BaseConsumer implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.graphChangePublisherQueue.close();
  }

  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE) private graphChangePublisherQueue: Queue,
    private graphStateManager: GraphStateManager,
    private blockchainService: BlockchainService,
    private encryptionService: EncryptionService,
  ) {
    super();
    cacheManager.defineCommand('updateLastProcessed', {
      numberOfKeys: 1,
      lua: fs.readFileSync('lua/updateLastProcessed.lua', 'utf8'),
    });
    this.logger = new Logger(RequestProcessorService.name);
  }

  async process(job: Job<ProviderGraphUpdateJob, any, string>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    this.logger.log(JSON.stringify(job.data));
    const blockDelay = SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND;
    try {
      const lastProcessedDsnpId = await this.cacheManager.get(LAST_PROCESSED_DSNP_ID_KEY);
      if (lastProcessedDsnpId && lastProcessedDsnpId === job.data.dsnpId) {
        this.logger.debug(`Delaying processing of job ${job.id} for ${blockDelay}ms`);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => {
          setTimeout(r, blockDelay);
        });
      }
      const decryptedKeyPairs = await this.encryptionService.decryptPrivateKeys(
        job.data.encryptionPublicKey,
        job.data.encryptionSenderContext,
        job.data.graphKeyPairs,
      );
      this.logger.log(JSON.stringify(decryptedKeyPairs));
      const { dsnpId, providerId } = job.data;
      this.graphStateManager.removeUserGraph(dsnpId);
      await this.graphStateManager.importBundles(dsnpId, decryptedKeyPairs ?? []);
      // using graphConnections form Action[] and update the user's DSNP Graph
      const actions: Action[] = await this.formConnections(dsnpId, providerId, job.data.connections);
      try {
        if (actions.length === 0) {
          this.logger.debug(`No actions to apply for user ${dsnpId}`);
        }
        this.graphStateManager.applyActions(actions, true);
      } catch (e: unknown) {
        const errMessage = e instanceof Error ? e.message : '';
        if (errMessage.includes('already exists')) {
          this.logger.warn(`Error applying actions: ${e}`);
        } else {
          throw new Error(`Error applying actions: ${e}`);
        }
      }
      const exportedUpdates = this.graphStateManager.exportUserGraphUpdates(dsnpId);
      this.logger.debug(`Exported ${exportedUpdates.length} updates for user ${dsnpId}`);
      // create a GraphUpdateJob for each exported update
      const graphPublisherJobs: GraphUpdateJob[] = exportedUpdates.map((update) => ({
        originalRequestJob: job.data,
        webhookUrl: job.data.webhookUrl,
        update,
      }));
      // add each GraphUpdateJob to the graph publisher queue
      graphPublisherJobs.forEach((graphPublisherJob) => {
        this.graphChangePublisherQueue.add(
          `Graph Publisher Job - ${graphPublisherJob.originalRequestJob.referenceId}`,
          graphPublisherJob,
        );
      });

      const reImported = await this.graphStateManager.importBundles(dsnpId, decryptedKeyPairs ?? []);
      if (reImported) {
        // Use lua script to update last processed dsnpId
        // @ts-expect-error updateLastProcessed is defined in the constructor
        await this.cacheManager.updateLastProcessed(LAST_PROCESSED_DSNP_ID_KEY, dsnpId.toString(), blockDelay);
        this.logger.debug(`Re-imported bundles for ${dsnpId.toString()}`);
        // eslint-disable-next-line no-await-in-loop
        const userGraphExists = this.graphStateManager.graphContainsUser(dsnpId.toString());
        if (!userGraphExists) {
          throw new Error(`User graph does not exist for ${dsnpId.toString()}`);
        }
      } else {
        throw new Error(`Error re-importing bundles for ${dsnpId.toString()}`);
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  private async importConnectionKeys(graphConnections: ConnectionDto[]): Promise<void> {
    const keyPromises = graphConnections
      .filter(
        ({ direction, privacyType, connectionType }) =>
          [Direction.ConnectionTo, Direction.Bidirectional].some((dir) => dir === direction) &&
          privacyType === PrivacyType.Private &&
          connectionType === ConnectionType.Friendship,
      )
      .map(({ dsnpId }) => this.graphStateManager.formDsnpKeys(dsnpId));
    const keys = await Promise.all(keyPromises);

    const bundles = keys.map((dsnpKeys) =>
      new ImportBundleBuilder().withDsnpUserId(dsnpKeys.dsnpUserId).withDsnpKeys(dsnpKeys).build(),
    );

    this.graphStateManager.importUserData(bundles);
  }

  async formConnections(
    dsnpUserId: MessageSourceId | AnyNumber,
    providerId: MessageSourceId | AnyNumber,
    graphConnections: ConnectionDto[],
  ): Promise<Action[]> {
    const dsnpKeys: DsnpKeys = await this.graphStateManager.formDsnpKeys(dsnpUserId);
    const actions: Action[] = [];
    // this.logger.debug(`Graph connections for user ${dsnpUserId.toString()}: ${JSON.stringify(graphConnections)}`);
    // Import DSNP public graph keys for connected users in private friendship connections
    await this.importConnectionKeys(graphConnections);
    await Promise.all(
      graphConnections.map(async (connection): Promise<void> => {
        const connectionType = connection.connectionType.toLowerCase();
        const privacyType = connection.privacyType.toLowerCase();
        const schemaId = this.graphStateManager.getSchemaIdFromConfig(
          connectionType as ConnectionType,
          privacyType as PrivacyType,
        );
        /// make sure user has delegation for schemaId
        const delegations = await this.blockchainService.getProviderDelegationForMsa(dsnpUserId, providerId);
        let isDelegated = false;
        if (delegations) {
          isDelegated = delegations.schemaDelegations.findIndex((grant) => grant.schemaId === schemaId) !== -1;
        }

        if (!isDelegated) {
          return;
        }

        switch (connection.direction) {
          case 'connectionTo': {
            const connectionAction: ConnectAction = {
              type: 'Connect',
              ownerDsnpUserId: dsnpUserId.toString(),
              connection: {
                dsnpUserId: connection.dsnpId,
                schemaId,
              },
            };

            if (dsnpKeys?.keys?.length > 0) {
              connectionAction.dsnpKeys = dsnpKeys;
            }

            actions.push(connectionAction);
            break;
          }
          case 'connectionFrom': {
            break;
          }
          case 'bidirectional': {
            const connectionAction: ConnectAction = {
              type: 'Connect',
              ownerDsnpUserId: dsnpUserId.toString(),
              connection: {
                dsnpUserId: connection.dsnpId,
                schemaId,
              },
            };

            if (dsnpKeys && dsnpKeys.keys.length > 0) {
              connectionAction.dsnpKeys = dsnpKeys;
            }

            actions.push(connectionAction);

            break;
          }
          case 'disconnect': {
            const connectionAction: DisconnectAction = {
              type: 'Disconnect',
              ownerDsnpUserId: dsnpUserId.toString(),
              connection: {
                dsnpUserId: connection.dsnpId,
                schemaId,
              },
            };
            actions.push(connectionAction);
            break;
          }
          default:
            throw new Error(`Unrecognized connection direction: ${connection.direction}`);
        }
      }),
    );

    return actions;
  }
}
