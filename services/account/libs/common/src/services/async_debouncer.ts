import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrivacyType } from '@dsnp/graph-sdk';
import { MessageSourceId, SchemaId } from '@frequency-chain/api-augment/interfaces';
import { QueueConstants } from '../utils/queues';
import { DsnpGraphEdge } from '../dtos/dsnp.graph.edge.dto';
import { ConfigService } from '../config/config.service';
import { GraphStateManager } from './graph-state-manager';
import { GraphKeyPairDto } from '../dtos/graph.key.pair.dto';

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

  public async getGraphForDsnpId(dsnpId: MessageSourceId, privacyType: string, graphKeyPairs?: GraphKeyPairDto[]): Promise<DsnpGraphEdge[]> {
    return this.debounceAsyncOperation(dsnpId, privacyType, graphKeyPairs);
  }

  public async setGraphForSchemaId(dsnpId: MessageSourceId, schemaId: SchemaId, graphKeyPairs?: GraphKeyPairDto[]): Promise<DsnpGraphEdge[]> {
    if (!schemaId) {
      throw new Error('Schema ID is required');
    }
    const privacyType = this.graphStateManager.getPrivacyForSchema(schemaId.toNumber());
    return this.debounceAsyncOperation(dsnpId, privacyType, graphKeyPairs);
  }

  async debounceAsyncOperation(dsnpId: MessageSourceId, privacyType: string, graphKeyPairs?: GraphKeyPairDto[]): Promise<DsnpGraphEdge[]> {
    const cacheKey = this.getCacheKey(dsnpId.toString(), privacyType);

    const cachedFuture = await this.redis.get(cacheKey);
    if (cachedFuture) {
      this.logger.debug(`Async operation for key ${dsnpId} is already inflight`);
      this.logger.debug(`Data: ${cachedFuture}`);
      const graphData: DsnpGraphEdge[] = JSON.parse(cachedFuture);
      if (graphData && graphData.length > 0) {
        return Promise.resolve(graphData);
      }
    }

    let privacyTypeValue = PrivacyType.Public;
    if (privacyType === 'private') {
      if (!graphKeyPairs || graphKeyPairs.length === 0) {
        throw new Error('Graph key pairs are required for private graph');
      }
      privacyTypeValue = PrivacyType.Private;
    }
    let graphEdges: DsnpGraphEdge[] = [];
    try {
      graphEdges = await this.graphStateManager.getConnectionsWithPrivacyType(dsnpId, privacyTypeValue, graphKeyPairs);
    } catch (err) {
      this.logger.error(`Error getting graph edges for ${dsnpId} with privacy type ${privacyType}`);
      this.logger.error(err);
      return Promise.resolve(graphEdges);
    }
    const debounceTime = this.configService.getDebounceSeconds();
    await this.redis.setex(cacheKey, debounceTime, JSON.stringify(graphEdges));
    // Remove the graph from the graph state after the debounce time
    this.scheduleRemoveUserGraph(dsnpId, debounceTime);
    return Promise.resolve(graphEdges);
  }

  private async scheduleRemoveUserGraph(dsnpId: MessageSourceId, debounceTime: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.graphStateManager.removeUserGraph(dsnpId.toString());
        resolve();
      }, debounceTime * 1000);
    });
  }

  private getCacheKey(key: string, privacyType: string): string {
    this.logger.debug(`Async operation for key ${key}:${privacyType}`);
    return `${QueueConstants.DEBOUNCER_CACHE_KEY}:${key}:${privacyType}`;
  }
}
