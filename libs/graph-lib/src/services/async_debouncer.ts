import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrivacyType } from '@dsnp/graph-sdk';
import * as QueueConstants from '../queues/queue-constants';
import { DsnpGraphEdgeDto } from '#types/dtos/graph/dsnp-graph-edge.dto';
import { ConfigService } from '../config/config.service';
import { GraphStateManager } from './graph-state-manager';
import { GraphKeyPairDto } from '#types/dtos/graph/graph-key-pair.dto';

@Injectable()
export class AsyncDebouncerService {
  private readonly logger: Logger;

  constructor(
    private redis: Redis,
    private readonly configService: ConfigService,
    private readonly graphStateManager: GraphStateManager,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  public getGraphForDsnpId(
    dsnpId: string,
    privacyType: PrivacyType,
    graphKeyPairs?: GraphKeyPairDto[],
  ): Promise<DsnpGraphEdgeDto[]> {
    return this.debounceAsyncOperation(dsnpId, privacyType, graphKeyPairs);
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
    return this.debounceAsyncOperation(dsnpId, privacyType, graphKeyPairs);
  }

  public async debounceAsyncOperation(
    dsnpId: string,
    privacyType: PrivacyType,
    graphKeyPairs?: GraphKeyPairDto[],
  ): Promise<DsnpGraphEdgeDto[]> {
    const cacheKey = this.getCacheKey(dsnpId, privacyType);

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
    let graphEdges: DsnpGraphEdgeDto[] = [];
    try {
      graphEdges = await this.graphStateManager.getConnectionsWithPrivacyType(dsnpId, privacyType, graphKeyPairs);
    } catch (err) {
      this.logger.error(`Error getting graph edges for ${dsnpId} with privacy type ${privacyType}`, err);
      return graphEdges;
    }
    const debounceTime = this.configService.debounceSeconds;
    await this.redis.setex(cacheKey, debounceTime, JSON.stringify(graphEdges));
    // Remove the graph from the graph state after the debounce time
    setTimeout(() => this.graphStateManager.removeUserGraph(dsnpId.toString()), debounceTime * 1000);
    return graphEdges;
  }

  private getCacheKey(key: string, privacyType: string): string {
    this.logger.debug(`Async operation for key ${key}:${privacyType}`);
    return `${QueueConstants.DEBOUNCER_CACHE_KEY}:${key}:${privacyType}`;
  }
}
