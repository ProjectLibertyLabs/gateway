import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { Queue } from 'bullmq';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { QueueStatusDto, BlockchainStatusDto, LatestBlockHeader } from '#types/dtos/common';
import { IContentPublishingApiConfig } from '#types/interfaces/content-publishing/api-config.interface';
import { ContentPublishingQueues } from '#types/constants/queue.constants';
import { plainToInstance } from 'class-transformer';

import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

// TODO: Expand types to include all relevant queue names
type QueueName = ContentPublishingQueues.QueueName;

type ConfigTypeName = 'content-publishing-api';

type ConfigType<T> = T extends ConfigTypeName ? IContentPublishingApiConfig : never;

@Injectable()
export class HealthCheckService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(ContentPublishingQueues.REQUEST_QUEUE_NAME) private readonly requestQueue: Queue,
    @InjectQueue(ContentPublishingQueues.ASSET_QUEUE_NAME) private readonly assetQueue: Queue,
    @InjectQueue(ContentPublishingQueues.PUBLISH_QUEUE_NAME) private readonly publishQueue: Queue,
    @InjectQueue(ContentPublishingQueues.BATCH_QUEUE_NAME) private readonly batchAnnouncerQueue: Queue,
    private readonly configService: ConfigService,
    private blockchainService: BlockchainRpcQueryService,
  ) {
    this.logger = pino(getBasicPinoOptions(this.constructor.name));
  }

  public async getQueueStatus(queues: Array<QueueName>): Promise<Array<QueueStatusDto>> {
    this.logger.debug(`Checking status for ${queues.length} queues`);
    const statusList: Array<PromiseSettledResult<QueueStatusDto>> = await Promise.allSettled(
      queues.map(async (name) => {
        const queue = this.getQueueByName(name);
        return {
          name,
          status: 'Queue is running',
          isPaused: await queue.isPaused(),
        };
      }),
    );
    return statusList.map((result, index) => {
      if (result.status === 'fulfilled') {
        return plainToInstance(QueueStatusDto, result.value);
      }
      return plainToInstance(QueueStatusDto, {
        name: queues[index],
        status: result.reason?.message || 'Unknown error',
        isPaused: null,
      });
    });
  }

  private getQueueByName(queueName: QueueName): Queue {
    const queuesMap = {
      [ContentPublishingQueues.ASSET_QUEUE_NAME]: this.assetQueue,
      [ContentPublishingQueues.REQUEST_QUEUE_NAME]: this.requestQueue,
      [ContentPublishingQueues.PUBLISH_QUEUE_NAME]: this.publishQueue,
      [ContentPublishingQueues.BATCH_QUEUE_NAME]: this.batchAnnouncerQueue,
    };

    const queue = queuesMap[queueName];
    if (!queue) {
      this.logger.warn(`Queue not found: ${queueName}`);
    }
    return queue;
  }

  public async getBlockchainStatus(): Promise<BlockchainStatusDto> {
    return plainToInstance(BlockchainStatusDto, {
      network: this.configService.get<string>('blockchain.providerRpcUrl'),
      nodeVersion: this.configService.get<string>('blockchain.nodeVersion'),
      nodeName: this.configService.get<string>('blockchain.nodeName'),
      latestBlockHeader: await this.getLatestBlockHeader(),
    });
  }

  public async getLatestBlockHeader(): Promise<LatestBlockHeader | null> {
    const headerStr = await this.redis.get('latestHeader');
    if (headerStr) {
      try {
        return JSON.parse(headerStr);
      } catch (err) {
        this.logger.warn('Failed to parse latestHeader from Redis:', err);
      }
    }

    // If not found in Redis, query the blockchain directly
    try {
      const latestHeader = await this.blockchainService.getLatestHeader();
      await this.redis.set('latestHeader', JSON.stringify(latestHeader));
      return latestHeader;
    } catch (err) {
      this.logger.error('Failed to fetch latest block header from blockchain:', err);
      return null;
    }
  }

  public getServiceConfig(serviceName: string): IContentPublishingApiConfig {
    return this.configService.get<ConfigType<typeof serviceName>>(serviceName);
  }
}
