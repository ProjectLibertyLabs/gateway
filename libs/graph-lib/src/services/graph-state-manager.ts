import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  Action,
  Graph,
  EnvironmentInterface,
  GraphKeyPair,
  GraphKeyType,
  ImportBundle,
  Update,
  Config,
  EnvironmentType,
  DsnpKeys,
  DsnpPublicKey,
  DsnpGraphEdge,
  ConnectionType,
  PrivacyType,
  ImportBundleBuilder,
  KeyData,
} from '@projectlibertylabs/graph-sdk';
import {
  ItemizedStoragePageResponse,
  MessageSourceId,
  PaginatedStorageResponse,
} from '@frequency-chain/api-augment/interfaces';
import { hexToU8a } from '@polkadot/util';
import { AnyNumber } from '@polkadot/types/types';
import { GraphKeyPairDto } from '#types/dtos/graph/graph-key-pair.dto';
import { KeyType } from '#types/dtos/graph/key-type.enum';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import graphCommonConfig, { IGraphCommonConfig } from '#config/graph-common.config';

@Injectable()
export class GraphStateManager implements OnApplicationBootstrap {
  private graphState: Graph;

  private environment: EnvironmentInterface; // Environment details

  private schemaIds: Record<string, Record<string, number>>;

  private graphKeySchemaId: number;

  private static graphStateFinalizer = new FinalizationRegistry((graphState: Graph) => {
    if (graphState) {
      graphState.freeGraphState();
    }
  });

  public onApplicationBootstrap() {
    if (!this.graphState) {
      throw new Error('Unable to initialize schema ids');
    }

    const publicFollow = this.graphState.getSchemaIdFromConfig(
      this.environment,
      ConnectionType.Follow,
      PrivacyType.Public,
    );
    const privateFollow = this.graphState.getSchemaIdFromConfig(
      this.environment,
      ConnectionType.Follow,
      PrivacyType.Private,
    );
    const privateFriend = this.graphState.getSchemaIdFromConfig(
      this.environment,
      ConnectionType.Friendship,
      PrivacyType.Private,
    );

    this.graphKeySchemaId = this.graphState.getGraphConfig(this.environment).graphPublicKeySchemaId;

    this.schemaIds = {
      [ConnectionType.Follow]: {
        [PrivacyType.Public]: publicFollow,
        [PrivacyType.Private]: privateFollow,
      },
      [ConnectionType.Friendship]: {
        [PrivacyType.Private]: privateFriend,
      },
    };
  }

  constructor(
    @Inject(graphCommonConfig.KEY) graphCommonConf: IGraphCommonConfig,
    private blockchainService: BlockchainRpcQueryService,
  ) {
    const { graphEnvironmentType } = graphCommonConf;
    this.environment = { environmentType: EnvironmentType[graphEnvironmentType] };
    this.graphState = new Graph(this.environment);

    GraphStateManager.graphStateFinalizer.register(this, this.graphState);
  }

  public getGraphState(): Graph {
    if (this.graphState) {
      return this.graphState;
    }
    return {} as Graph;
  }

  public getGraphConfig(): Config {
    if (this.graphState) {
      return this.graphState.getGraphConfig(this.environment);
    }
    return {} as Config;
  }

  public getPrivacyForSchema(schemaId: number): PrivacyType {
    let privacyType = PrivacyType.Public;
    if (
      this.schemaIds[ConnectionType.Follow][PrivacyType.Private] === schemaId ||
      this.schemaIds[ConnectionType.Friendship][PrivacyType.Private] === schemaId
    ) {
      privacyType = PrivacyType.Private;
    }
    return privacyType;
  }

  public getConnectionTypeForSchema(schemaId: number): ConnectionType {
    let connectionType = ConnectionType.Friendship;
    if (
      this.schemaIds[ConnectionType.Follow][PrivacyType.Private] === schemaId ||
      this.schemaIds[ConnectionType.Follow][PrivacyType.Public] === schemaId
    ) {
      connectionType = ConnectionType.Follow;
    }
    return connectionType;
  }

  public getSchemaIdFromConfig(connectionType: ConnectionType, privacyType: PrivacyType): number {
    return this.schemaIds[connectionType][privacyType] ?? 0;
  }

  public getGraphKeySchemaId(): number {
    return this.graphKeySchemaId;
  }

  public static generateKeyPair(keyType: GraphKeyType): GraphKeyPair {
    return Graph.generateKeyPair(keyType);
  }

  public static deserializeDsnpKeys(keys: DsnpKeys): DsnpPublicKey[] {
    return Graph.deserializeDsnpKeys(keys);
  }

  public importUserData(payload: ImportBundle[]): boolean {
    if (this.graphState) {
      return this.graphState.importUserData(payload);
    }
    return false;
  }

  public applyActions(actions: Action[], ignoreExistingConnection: boolean): boolean {
    if (this.graphState) {
      return this.graphState.applyActions(actions, { ignoreExistingConnections: ignoreExistingConnection });
    }
    return false;
  }

  public exportGraphUpdates(): Update[] {
    if (this.graphState) {
      return this.graphState.exportUpdates();
    }
    return [];
  }

  public exportUserGraphUpdates(dsnpId: string): Update[] {
    if (this.graphState) {
      return this.graphState.exportUserGraphUpdates(dsnpId);
    }

    return [];
  }

  public removeUserGraph(dsnpUserId: string): boolean {
    if (this.graphState) {
      return this.graphState.removeUserGraph(dsnpUserId);
    }
    return false;
  }

  public graphContainsUser(dsnpUserId: string): boolean {
    if (this.graphState) {
      return this.graphState.containsUserGraph(dsnpUserId);
    }
    return false;
  }

  public async getConnectionsWithPrivacyTypeAndConnectionType(
    dsnpUserId: string,
    privacyType: PrivacyType,
    connectionType: ConnectionType,
    graphKeyPairs?: GraphKeyPairDto[],
  ): Promise<DsnpGraphEdge[]> {
    const requestedSchemaId = this.getSchemaIdFromConfig(connectionType, privacyType);
    if (requestedSchemaId === 0) {
      throw new Error(`No schema is configured for combination of ${privacyType} and ${connectionType}`);
    }

    if (this.graphState && this.graphState.containsUserGraph(dsnpUserId.toString())) {
      const connections = this.graphState.getConnectionsForUserGraph(dsnpUserId.toString(), requestedSchemaId, false);
      if (connections.length > 0) {
        return connections;
      }
    }
    const bundlesImported = await this.importBundles(dsnpUserId, graphKeyPairs ?? []);
    if (bundlesImported) {
      return this.graphState.getConnectionsForUserGraph(dsnpUserId.toString(), requestedSchemaId, false);
    }
    throw new Error(`Failed to get connections for user ${dsnpUserId} and ${privacyType} ${connectionType} graph`);
  }

  async importBundles(dsnpUserId: string, graphKeyPairs: GraphKeyPairDto[]): Promise<boolean> {
    const importBundles = await this.formImportBundles(dsnpUserId, graphKeyPairs);
    return this.importUserData(importBundles);
  }

  async formImportBundles(dsnpUserId: string, graphKeyPairs: GraphKeyPairDto[]): Promise<ImportBundle[]> {
    const publicFollowSchemaId = this.getSchemaIdFromConfig(ConnectionType.Follow, PrivacyType.Public);
    const privateFollowSchemaId = this.getSchemaIdFromConfig(ConnectionType.Follow, PrivacyType.Private);
    const privateFriendshipSchemaId = this.getSchemaIdFromConfig(ConnectionType.Friendship, PrivacyType.Private);

    const publicFollows: PaginatedStorageResponse[] = await this.blockchainService.getPaginatedStorage(
      dsnpUserId,
      publicFollowSchemaId,
    );
    const privateFollows: PaginatedStorageResponse[] = await this.blockchainService.getPaginatedStorage(
      dsnpUserId,
      privateFollowSchemaId,
    );
    const privateFriendships: PaginatedStorageResponse[] = await this.blockchainService.getPaginatedStorage(
      dsnpUserId,
      privateFriendshipSchemaId,
    );
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
    if (
      publicFollows.length + privateFollows.length + privateFriendships.length === 0 &&
      (graphKeyPairs.length > 0 || dsnpKeys?.keys.length > 0)
    ) {
      let builder = importBundleBuilder.withDsnpUserId(dsnpUserId.toString()).withSchemaId(privateFollowSchemaId);

      if (dsnpKeys?.keys?.length > 0) {
        builder = builder.withDsnpKeys(dsnpKeys);
      }
      if (graphKeyPairs?.length > 0) {
        builder = builder.withGraphKeyPairs(graphKeyPairsSdk);
      }

      importBundles = [builder.build()];
    } else {
      importBundles = [publicFollows, privateFollows, privateFriendships].flatMap(
        (pageResponses: PaginatedStorageResponse[]) =>
          pageResponses.map((pageResponse) => {
            let builder = importBundleBuilder
              .withDsnpUserId(pageResponse.msa_id.toString())
              .withSchemaId(pageResponse.schema_id.toNumber())
              .withPageData(
                pageResponse.page_id.toNumber(),
                pageResponse.payload,
                pageResponse.content_hash.toNumber(),
              );

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

  async formDsnpKeys(dsnpUserId: MessageSourceId | AnyNumber): Promise<DsnpKeys> {
    const publicKeySchemaId = this.getGraphKeySchemaId();
    const publicKeys: ItemizedStoragePageResponse = await this.blockchainService.getItemizedStorage(
      dsnpUserId,
      publicKeySchemaId,
    );
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

  public getConnectionsForUserGraph(dsnpUserId: string, schemaId: number, includePending: boolean): DsnpGraphEdge[] {
    if (this.graphState) {
      return this.graphState.getConnectionsForUserGraph(dsnpUserId, schemaId, includePending);
    }
    return [];
  }

  public getConnectionWithoutKeys(): string[] {
    if (this.graphState) {
      return this.graphState.getConnectionsWithoutKeys();
    }
    return [];
  }

  public getOneSidedPrivateFriendshipConnections(dsnpUserId: string): DsnpGraphEdge[] {
    if (this.graphState) {
      return this.graphState.getOneSidedPrivateFriendshipConnections(dsnpUserId);
    }
    return [];
  }

  public getPublicKeys(dsnpUserId: string): DsnpPublicKey[] {
    if (this.graphState) {
      return this.graphState.getPublicKeys(dsnpUserId);
    }
    return [];
  }

  public forceCalculateGraphs(dsnpUserId: string): Update[] {
    if (this.graphState) {
      return this.graphState.forceCalculateGraphs(dsnpUserId);
    }
    return [];
  }
}
