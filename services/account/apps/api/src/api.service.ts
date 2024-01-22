import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { MessageSourceId } from '@frequency-chain/api-augment/interfaces';
import {
  AsyncDebouncerService,
  GraphChangeRepsonseDto,
  GraphStateManager,
  GraphsQueryParamsDto,
  ProviderGraphDto,
  ProviderGraphUpdateJob,
  QueueConstants,
  UserGraphDto,
  WatchGraphsDto,
} from '../../../libs/common/src';
import { ConfigService } from '../../../libs/common/src/config/config.service';
import { BlockchainService } from '../../../libs/common/src/blockchain/blockchain.service';

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private readonly logger: Logger;

  private asyncDebouncerService: AsyncDebouncerService;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private graphChangeRequestQueue: Queue,
    private graphStateManager: GraphStateManager,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.asyncDebouncerService = new AsyncDebouncerService(this.redis, this.configService, this.graphStateManager);
  }

  onApplicationShutdown(signal?: string | undefined) {
    this.logger.log('Cleanup on shutdown completed.');
  }

  async enqueueRequest(request: ProviderGraphDto): Promise<GraphChangeRepsonseDto> {
    const providerId = this.configService.getProviderId();
    const data: ProviderGraphUpdateJob = {
      dsnpId: request.dsnpId,
      providerId,
      connections: request.connections.data,
      graphKeyPairs: request.graphKeyPairs,
      referenceId: this.calculateJobId(request),
      updateConnection: this.configService.getReconnectionServiceRequired(),
    };
    const jobOld = await this.graphChangeRequestQueue.getJob(data.referenceId);
    if (jobOld && (await jobOld.isCompleted())) {
      await jobOld.remove();
    }
    const job = await this.graphChangeRequestQueue.add(`Request Job - ${data.referenceId}`, data, { jobId: data.referenceId });
    this.logger.debug(job);
    return {
      referenceId: data.referenceId,
    };
  }

  async watchGraphs(watchGraphsDto: WatchGraphsDto): Promise<void> {
    watchGraphsDto.dsnpIds.forEach(async (dsnpId) => {
      const redisKey = `${QueueConstants.REDIS_WATCHER_PREFIX}:${dsnpId}`;
      const redisValue = watchGraphsDto.webhookEndpoint;
      // eslint-disable-next-line no-await-in-loop
      await this.redis.rpush(redisKey, redisValue);
    });
  }

  async getGraphs(queryParams: GraphsQueryParamsDto): Promise<UserGraphDto[]> {
    const { dsnpIds, privacyType } = queryParams;
    const graphKeyPairs = queryParams.graphKeyPairs || [];
    const graphs: UserGraphDto[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const dsnpId of dsnpIds) {
      const dsnpUserId: MessageSourceId = this.blockchainService.api.registry.createType('MessageSourceId', dsnpId);
      // eslint-disable-next-line no-await-in-loop
      const graphEdges = await this.asyncDebouncerService.getGraphForDsnpId(dsnpUserId, privacyType, graphKeyPairs);
      graphs.push({
        dsnpId,
        dsnpGraphEdges: graphEdges,
      });
    }
    return graphs;
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: ProviderGraphDto): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }
}
