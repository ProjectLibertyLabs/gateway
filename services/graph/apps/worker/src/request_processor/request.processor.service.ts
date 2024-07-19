import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { ConnectionType, ImportBundleBuilder, ConnectAction, DsnpKeys, DisconnectAction, Action, PrivacyType } from '@dsnp/graph-sdk';
import { MessageSourceId, SchemaGrantResponse } from '@frequency-chain/api-augment/interfaces';
import { Option, Vec } from '@polkadot/types';
import { AnyNumber } from '@polkadot/types/types';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { BaseConsumer } from '../BaseConsumer';
import * as QueueConstants from '#lib/utils/queues';
import fs from 'fs';
import {
  GraphStateManager,
  BlockchainService,
  ProviderGraphUpdateJob,
  SECONDS_PER_BLOCK,
  GraphUpdateJob,
  ConnectionDto,
  Direction,
  createReconnectionJob,
  SkipTransitiveGraphs,
} from '#lib';

@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE)
export class RequestProcessorService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.RECONNECT_REQUEST_QUEUE) private reconnectionQueue: Queue,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE) private graphChangePublisherQueue: Queue,
    private graphStateManager: GraphStateManager,
    private blockchainService: BlockchainService,
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
    const blockDelay = SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND;
    try {
      const lastProcessedDsnpId = await this.cacheManager.get(QueueConstants.LAST_PROCESSED_DSNP_ID_KEY);
      if (lastProcessedDsnpId && lastProcessedDsnpId === job.data.dsnpId) {
        this.logger.debug(`Delaying processing of job ${job.id} for ${blockDelay}ms`);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => {
          setTimeout(r, blockDelay);
        });
      }
      const { dsnpId, providerId } = job.data;
      this.graphStateManager.removeUserGraph(dsnpId);
      await this.graphStateManager.importBundles(dsnpId, job.data.graphKeyPairs ?? []);
      // using graphConnections form Action[] and update the user's DSNP Graph
      const actions: Action[] = await this.formConnections(dsnpId, providerId, job.data.updateConnection, job.data.connections);
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
        referenceId: job.data.referenceId,
        webhookUrl: job.data.webhookUrl,
        update,
      }));
      // add each GraphUpdateJob to the graph publisher queue
      graphPublisherJobs.forEach((graphPublisherJob) => {
        this.graphChangePublisherQueue.add(`Graph Publisher Job - ${graphPublisherJob.referenceId}`, graphPublisherJob);
      });

      const reImported = await this.graphStateManager.importBundles(dsnpId, job.data.graphKeyPairs ?? []);
      if (reImported) {
        // Use lua script to update last processed dsnpId
        // @ts-expect-error updateLastProcessed is defined in the constructor
        await this.cacheManager.updateLastProcessed(QueueConstants.LAST_PROCESSED_DSNP_ID_KEY, dsnpId.toString(), blockDelay);
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
          [Direction.ConnectionTo, Direction.Bidirectional].some((dir) => dir === direction) && privacyType === PrivacyType.Private && connectionType === ConnectionType.Friendship,
      )
      .map(({ dsnpId }) => this.graphStateManager.formDsnpKeys(dsnpId));
    const keys = await Promise.all(keyPromises);

    const bundles = keys.map((dsnpKeys) => new ImportBundleBuilder().withDsnpUserId(dsnpKeys.dsnpUserId).withDsnpKeys(dsnpKeys).build());

    this.graphStateManager.importUserData(bundles);
  }

  async formConnections(
    dsnpUserId: MessageSourceId | AnyNumber,
    providerId: MessageSourceId | AnyNumber,
    isTransitive: boolean,
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
        const schemaId = this.graphStateManager.getSchemaIdFromConfig(connectionType as ConnectionType, privacyType as PrivacyType);
        /// make sure user has delegation for schemaId
        let delegations: Option<Vec<SchemaGrantResponse>> = await this.blockchainService.rpc('msa', 'grantedSchemaIdsByMsaId', dsnpUserId, providerId);
        let isDelegated = false;
        if (delegations.isSome) {
          isDelegated =
            delegations
              .unwrap()
              .toArray()
              .findIndex((grant) => grant.schema_id.toNumber() === schemaId) !== -1;
        }

        if (!isDelegated) {
          return;
        }

        /// make sure incoming user connection is also delegated for queuing updates non-transitively
        let isDelegatedConnection = false;
        if (isTransitive && (connection.direction === 'connectionFrom' || connection.direction === 'bidirectional')) {
          delegations = await this.blockchainService.rpc('msa', 'grantedSchemaIdsByMsaId', connection.dsnpId, providerId);
          if (delegations.isSome) {
            isDelegatedConnection =
              delegations
                .unwrap()
                .toArray()
                .findIndex((grant) => grant.schema_id.toNumber() === schemaId) !== -1;
          }
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
            if (isDelegatedConnection) {
              const { key: jobId, data } = createReconnectionJob(connection.dsnpId, providerId, SkipTransitiveGraphs);
              this.reconnectionQueue.remove(jobId);
              this.reconnectionQueue.add(`graphUpdate:${data.dsnpId}`, data, { jobId });
            }
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

            if (isDelegatedConnection) {
              const { key: jobId, data } = createReconnectionJob(connection.dsnpId, providerId, SkipTransitiveGraphs);
              this.reconnectionQueue.remove(jobId);
              this.reconnectionQueue.add(`graphUpdate:${data.dsnpId}`, data, { jobId });
            }
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
            if (isDelegatedConnection) {
              const { key: jobId, data } = createReconnectionJob(connection.dsnpId, providerId, SkipTransitiveGraphs);
              this.reconnectionQueue.remove(jobId);
              this.reconnectionQueue.add(`graphUpdate:${data.dsnpId}`, data, { jobId });
            }
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
