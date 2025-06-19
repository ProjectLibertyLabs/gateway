import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { QueueStatusDto, BlockchainStatusDto } from '#types/dtos/common';
import { IContentPublishingApiConfig } from '#types/interfaces/content-publishing/api-config.interface';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';
import { plainToInstance } from 'class-transformer';

type ConfigTypeName = 'content-publishing-api';

type ConfigType<T> = T extends ConfigTypeName ? IContentPublishingApiConfig : never;

@Injectable()
export class HealthCheckService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue,
    @InjectQueue(QueueConstants.ASSET_QUEUE_NAME) private assetQueue: Queue,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    @InjectQueue(QueueConstants.BATCH_QUEUE_NAME) private readonly batchAnnouncerQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  // TODO: Refactor to require only list of queue names
  public async getQueueStatus(queues: Array<{ name: string; queue: Queue }>): Promise<Array<QueueStatusDto>> {
    this.logger.debug(`Checking status for ${queues.length} queues`);
    const statusList: Array<PromiseSettledResult<QueueStatusDto>> = await Promise.allSettled(
      queues.map(async ({ name, queue }) => ({
        name,
        status: 'Queue is running',
        isPaused: await queue.isPaused(),
      })),
    );
    return statusList.map((result, index) => {
      if (result.status === 'fulfilled') {
        return plainToInstance(QueueStatusDto, result.value);
      }
      return plainToInstance(QueueStatusDto, {
        name: queues[index].name,
        status: result.reason?.message || 'Unknown error',
        isPaused: null,
      });
    });
  }

  // TODO: Expand to include which chain and other relevant details
  public async getBlockchainStatus(): Promise<BlockchainStatusDto> {
    return plainToInstance(BlockchainStatusDto, {
      latestBlockHeader: await this.getLatestBlockHeader(),
    });
  }

  public async getLatestBlockHeader(): Promise<any | null> {
    const headerStr = await this.redis.get('latestHeader');
    if (!headerStr) {
      return null;
    }
    try {
      return JSON.parse(headerStr);
    } catch (err) {
      this.logger.warn('Failed to parse latestHeader from Redis:', err);
      return null;
    }
  }

  public getServiceConfig(serviceName: string): IContentPublishingApiConfig {
    return this.configService.get<ConfigType<typeof serviceName>>(serviceName);
  }
}
