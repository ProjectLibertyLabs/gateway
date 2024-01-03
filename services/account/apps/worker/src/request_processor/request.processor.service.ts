import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { ImportBundle, ConnectionType, GraphKeyPair, GraphKeyType, ImportBundleBuilder, ConnectAction, DsnpKeys, KeyData } from '@dsnp/graph-sdk';
import { MessageSourceId, PaginatedStorageResponse, SchemaGrantResponse, ItemizedStoragePageResponse, ProviderId } from '@frequency-chain/api-augment/interfaces';
import { Option, Vec } from '@polkadot/types';
import { AnyNumber } from '@polkadot/types/types';
import { hexToU8a } from '@polkadot/util';
import { BaseConsumer } from '../BaseConsumer';
import {
  ConnectionDto,
  GraphKeyPairDto,
  GraphStateManager,
  GraphUpdateJob,
  KeyType,
  PrivacyType,
  ProviderGraphUpdateJob,
  QueueConstants,
  SkipTransitiveGraphs,
  createReconnectionJob,
} from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { Direction } from '../../../../libs/common/src/dtos/direction.dto';

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
  }

  async process(job: Job<ProviderGraphUpdateJob, any, string>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      const dsnpUserId: MessageSourceId = this.blockchainService.api.registry.createType('MessageSourceId', job.data.dsnpId);
      const providerId: ProviderId = this.blockchainService.api.registry.createType('ProviderId', job.data.providerId);
      await this.importBundles(dsnpUserId, job.data.graphKeyPairs ?? []);
      // using graphConnections form Action[] and update the user's DSNP Graph
      const actions: ConnectAction[] = await this.formConnections(dsnpUserId, providerId, job.data.updateConnection, job.data.connections);
      try {
        if (actions.length === 0) {
          this.logger.debug(`No actions to apply for user ${dsnpUserId.toString()}`);
        }
        this.graphStateManager.applyActions(actions, true);
      } catch (e: any) {
        const errMessage = e instanceof Error ? e.message : '';
        if (errMessage.includes('already exists')) {
          this.logger.warn(`Error applying actions: ${e}`);
        } else {
          throw new Error(`Error applying actions: ${e}`);
        }
        const exportedUpdates = this.graphStateManager.exportUserGraphUpdates(dsnpUserId.toString());
        // create a GraphUpdateJob for each exported update
        const graphPublisherJobs: GraphUpdateJob[] = exportedUpdates.map((update) => ({
          referenceId: job.data.referenceId,
          update,
        }));
        // add each GraphUpdateJob to the graph publisher queue
        graphPublisherJobs.forEach((graphPublisherJob) => {
          this.graphChangePublisherQueue.add(`Graph Publisher Job - ${graphPublisherJob.referenceId}`, graphPublisherJob, {
            removeOnFail: false,
            removeOnComplete: 2000,
          });
        });

        const reImported = await this.importBundles(dsnpUserId, job.data.graphKeyPairs ?? []);
        if (reImported) {
          // eslint-disable-next-line no-await-in-loop
          const userGraphExists = this.graphStateManager.graphContainsUser(dsnpUserId.toString());
          if (!userGraphExists) {
            throw new Error(`User graph does not exist for ${dsnpUserId.toString()}`);
          }
        } else {
          throw new Error(`Error re-importing bundles for ${dsnpUserId.toString()}`);
        }

        /// TODO send DSNPGraphEdge[] to debounced queue
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async importBundles(dsnpUserId: MessageSourceId, graphKeyPairs: GraphKeyPairDto[]): Promise<boolean> {
    const importBundles = await this.formImportBundles(dsnpUserId, graphKeyPairs);
    return this.graphStateManager.importUserData(importBundles);
  }

  async formImportBundles(dsnpUserId: MessageSourceId, graphKeyPairs: GraphKeyPairDto[]): Promise<ImportBundle[]> {
    const publicFollowSchemaId = this.graphStateManager.getSchemaIdFromConfig(ConnectionType.Follow, PrivacyType.Public);
    const privateFollowSchemaId = this.graphStateManager.getSchemaIdFromConfig(ConnectionType.Follow, PrivacyType.Private);
    const privateFriendshipSchemaId = this.graphStateManager.getSchemaIdFromConfig(ConnectionType.Friendship, PrivacyType.Private);

    const publicFollows: PaginatedStorageResponse[] = await this.blockchainService.rpc('statefulStorage', 'getPaginatedStorage', dsnpUserId, publicFollowSchemaId);
    const privateFollows: PaginatedStorageResponse[] = await this.blockchainService.rpc('statefulStorage', 'getPaginatedStorage', dsnpUserId, privateFollowSchemaId);
    const privateFriendships: PaginatedStorageResponse[] = await this.blockchainService.rpc('statefulStorage', 'getPaginatedStorage', dsnpUserId, privateFriendshipSchemaId);
    const dsnpKeys = await this.formDsnpKeys(dsnpUserId);
    const graphKeyPairsSdk = graphKeyPairs.map(
      (keyPair: GraphKeyPairDto): GraphKeyPair => ({
        keyType: GraphKeyType.X25519,
        publicKey: hexToU8a(keyPair.publicKey),
        secretKey: hexToU8a(keyPair.privateKey),
      }),
    );
    const importBundleBuilder = new ImportBundleBuilder();
    // Only X25519 is supported for now
    // check if all keys are of type X25519
    const areKeysCorrectType = graphKeyPairs.every((keyPair) => keyPair.keyType === KeyType.X25519);
    if (!areKeysCorrectType) {
      throw new Error('Only X25519 keys are supported for now');
    }

    let importBundles: ImportBundle[];

    // If no pages to import, import at least one empty page so that user graph will be created
    if (publicFollows.length + privateFollows.length + privateFriendships.length === 0 && (graphKeyPairs.length > 0 || dsnpKeys?.keys.length > 0)) {
      let builder = importBundleBuilder.withDsnpUserId(dsnpUserId.toString()).withSchemaId(privateFollowSchemaId);

      if (dsnpKeys?.keys?.length > 0) {
        builder = builder.withDsnpKeys(dsnpKeys);
      }
      if (graphKeyPairs?.length > 0) {
        builder = builder.withGraphKeyPairs(graphKeyPairsSdk);
      }

      importBundles = [builder.build()];
    } else {
      importBundles = [publicFollows, privateFollows, privateFriendships].flatMap((pageResponses: PaginatedStorageResponse[]) =>
        pageResponses.map((pageResponse) => {
          let builder = importBundleBuilder
            .withDsnpUserId(pageResponse.msa_id.toString())
            .withSchemaId(pageResponse.schema_id.toNumber())
            .withPageData(pageResponse.page_id.toNumber(), pageResponse.payload, pageResponse.content_hash.toNumber());

          if (dsnpKeys?.keys?.length > 0) {
            builder = builder.withDsnpKeys(dsnpKeys);
          }
          if (graphKeyPairs?.length > 0) {
            builder = builder.withGraphKeyPairs(graphKeyPairsSdk);
          }

          return builder.build();
        }),
      );
    }

    return importBundles;
  }

  private async importConnectionKeys(graphConnections: ConnectionDto[]): Promise<void> {
    const keyPromises = graphConnections
      .filter(
        ({ direction, privacyType, connectionType }) =>
          [Direction.ConnectionTo, Direction.Bidirectional].some((dir) => dir === direction) && privacyType === PrivacyType.Private && connectionType === ConnectionType.Friendship,
      )
      .map(({ dsnpId }) => this.formDsnpKeys(dsnpId));
    const keys = await Promise.all(keyPromises);

    const bundles = keys.map((dsnpKeys) => new ImportBundleBuilder().withDsnpUserId(dsnpKeys.dsnpUserId).withDsnpKeys(dsnpKeys).build());

    this.graphStateManager.importUserData(bundles);
  }

  async formConnections(
    dsnpUserId: MessageSourceId | AnyNumber,
    providerId: MessageSourceId | AnyNumber,
    isTransitive: boolean,
    graphConnections: ConnectionDto[],
  ): Promise<ConnectAction[]> {
    const dsnpKeys: DsnpKeys = await this.formDsnpKeys(dsnpUserId);
    const actions: ConnectAction[] = [];
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
          default:
            throw new Error(`Unrecognized connection direction: ${connection.direction}`);
        }
      }),
    );

    return actions;
  }

  async formDsnpKeys(dsnpUserId: MessageSourceId | AnyNumber): Promise<DsnpKeys> {
    const publicKeySchemaId = this.graphStateManager.getGraphKeySchemaId();
    const publicKeys: ItemizedStoragePageResponse = await this.blockchainService.rpc('statefulStorage', 'getItemizedStorage', dsnpUserId, publicKeySchemaId);
    const keyData: KeyData[] = publicKeys.items.toArray().map((publicKey) => ({
      index: publicKey.index.toNumber(),
      content: hexToU8a(publicKey.payload.toHex()),
    }));
    const dsnpKeys: DsnpKeys = {
      dsnpUserId: dsnpUserId.toString(),
      keysHash: publicKeys.content_hash.toNumber(),
      keys: keyData,
    };
    return dsnpKeys;
  }
}
