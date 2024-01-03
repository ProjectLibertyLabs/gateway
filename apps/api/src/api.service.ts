import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { GraphChangeRepsonseDto, ProviderGraphDto, ProviderGraphUpdateJob, QueueConstants, WatchGraphsDto } from '../../../libs/common/src';
import { ConfigService } from '../../../libs/common/src/config/config.service';

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private graphChangeRequestQueue: Queue,
    private configService: ConfigService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  onApplicationShutdown(signal?: string | undefined) {
    this.cleanupOnShutdown().then(() => {
      this.logger.log('Cleanup on shutdown completed.');
    });
  }

  async enqueueRequest(request: ProviderGraphDto): Promise<GraphChangeRepsonseDto> {
    const providerId = this.configService.getProviderId();
    const data: ProviderGraphUpdateJob = {
      dsnpId: request.dsnpId,
      providerId,
      connections: request.connections.data,
      referenceId: this.calculateJobId(request),
      updateConnection: this.configService.getReconnectionServiceRequired(),
    };
    const job = await this.graphChangeRequestQueue.add(`Request Job - ${data.referenceId}`, data, { jobId: data.referenceId, removeOnFail: false, removeOnComplete: 2000 }); // TODO: should come from queue configs
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

  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: ProviderGraphDto): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  private async cleanupOnShutdown(): Promise<void> {
    const keys = await this.redis.keys(`${QueueConstants.REDIS_WATCHER_PREFIX}:*`);

    if (keys.length > 0) {
      await this.redis.del(keys);
      this.logger.log(`Removed keys on shutdown: ${keys.join(', ')}`);
    }
  }
}
