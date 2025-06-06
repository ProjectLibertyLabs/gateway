import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConnectionType, PrivacyType } from '@projectlibertylabs/graph-sdk';
import { DsnpGraphEdgeDto } from '#types/dtos/graph/dsnp-graph-edge.dto';
import { GraphStateManager } from './graph-state-manager';
import { GraphKeyPairDto } from '#types/dtos/graph/graph-key-pair.dto';
import { DEBOUNCER_CACHE_KEY } from '#types/constants';
import { InjectRedis } from '@songkeys/nestjs-redis';
import graphCommonConfig, { IGraphCommonConfig } from '#config/graph-common.config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class AsyncDebouncerService {
  constructor(
    @InjectRedis() private redis: Redis,
    @Inject(graphCommonConfig.KEY) private readonly config: IGraphCommonConfig,
    private readonly graphStateManager: GraphStateManager,
    @InjectPinoLogger(AsyncDebouncerService.name)
    private readonly logger: PinoLogger,
  ) {}

  public getGraphForDsnpId(
    dsnpId: string,
    privacyType: PrivacyType,
    connectionType: ConnectionType,
    graphKeyPairs?: GraphKeyPairDto[],
  ): Promise<DsnpGraphEdgeDto[]> {
    return this.debounceAsyncOperation(dsnpId, privacyType, connectionType, graphKeyPairs);
  }

  public setGraphForSchemaId(
    dsnpId: string,
    schemaId: number,
    graphKeyPairs?: GraphKeyPairDto[],
  ): Promise<DsnpGraphEdgeDto[]> {
    if (!schemaId) {
      throw new Error('Schema ID is required');
    }
    const privacyType = this.graphStateManager.getPrivacyForSchema(schemaId);
    const connectionType = this.graphStateManager.getConnectionTypeForSchema(schemaId);
    return this.debounceAsyncOperation(dsnpId, privacyType, connectionType, graphKeyPairs);
  }

  public async debounceAsyncOperation(
    dsnpId: string,
    privacyType: PrivacyType,
    connectionType: ConnectionType,
    graphKeyPairs?: GraphKeyPairDto[],
  ): Promise<DsnpGraphEdgeDto[]> {
    const cacheKey = this.getCacheKey(dsnpId, privacyType, connectionType);

    const cachedFuture = await this.redis.get(cacheKey);
    if (cachedFuture) {
      this.logger.debug(`Async operation for key ${dsnpId} is already inflight`, cachedFuture);
      const graphData: DsnpGraphEdgeDto[] = JSON.parse(cachedFuture);
      if (graphData && graphData.length > 0) {
        return graphData;
      }
    }

    if (privacyType === PrivacyType.Private) {
      if (!graphKeyPairs || graphKeyPairs.length === 0) {
        throw new Error('Graph key pairs are required for private graph');
      }
    }
    const graphEdges: DsnpGraphEdgeDto[] = await this.graphStateManager.getConnectionsWithPrivacyTypeAndConnectionType(
      dsnpId,
      privacyType,
      connectionType,
      // this would ensure that we will get public data regardless of invalid key pairs in request
      privacyType === PrivacyType.Public ? [] : graphKeyPairs,
    );
    const debounceTime = this.config.debounceSeconds;
    await this.redis.setex(cacheKey, debounceTime, JSON.stringify(graphEdges));
    // Remove the graph from the graph state after the debounce time
    setTimeout(() => this.graphStateManager.removeUserGraph(dsnpId.toString()), debounceTime * 1000);
    return graphEdges;
  }

  private getCacheKey(key: string, privacyType: string, connectionType: string): string {
    this.logger.debug(`Async operation for key ${key}:${privacyType}:${connectionType}`);
    return `${DEBOUNCER_CACHE_KEY}:${key}:${privacyType}:${connectionType}`;
  }
}
