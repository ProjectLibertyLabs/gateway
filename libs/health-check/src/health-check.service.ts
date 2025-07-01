import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { Queue } from 'bullmq';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { RedisStatusDto, QueueStatusDto, BlockchainStatusDto, LatestBlockHeader } from '#types/dtos/common';
import { IContentPublishingApiConfig } from '#types/interfaces/content-publishing/api-config.interface';
import { ContentPublishingQueues } from '#types/constants/queue.constants';
import { plainToInstance } from 'class-transformer';
import fs from 'fs';

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
    redis.defineCommand('queueStatus', {
      numberOfKeys: 0,
      lua: fs.readFileSync('lua/queueStatus.lua', 'utf8'),
    });
    this.logger = pino(getBasicPinoOptions(this.constructor.name));
  }

  public async getRedisStatus(queues: Array<QueueName>): Promise<RedisStatusDto> {
    const queuePrefixes = queues.map((queueName) => this.QueueNameToKey(queueName)).filter((key) => !!key);
    if (queuePrefixes.length === 0) {
      this.logger.warn('No valid queue prefixes found for status check');
    }
    try {
      // @ts-expect-error queueStatus is defined in the constructor
      const result = await this.redis.queueStatus(queuePrefixes);
      this.logger.debug('Lua script result:', result as string);
      const parsed = JSON.parse(result as string);
      return plainToInstance(RedisStatusDto, {
        redis_version: parsed.redis_version,
        used_memory: parsed.used_memory,
        maxmemory: parsed.maxmemory,
        uptime_in_seconds: parsed.uptime_in_seconds,
        connected_clients: parsed.connected_clients,
        queues: parsed.queues.map((queue: any) => plainToInstance(QueueStatusDto, queue)),
      });
    } catch (error) {
      console.error('Error executing Lua script for queue status:', error);
      return plainToInstance(RedisStatusDto, {
        redis_version: null,
        used_memory: null,
        maxmemory: null,
        uptime_in_seconds: null,
        connected_clients: null,
        queues: [],
      });
    }
  }

  private QueueNameToKey(queueName: QueueName): string {
    const keysMap = {
      [ContentPublishingQueues.ASSET_QUEUE_NAME]: 'bull:assetQueue',
      [ContentPublishingQueues.REQUEST_QUEUE_NAME]: 'bull:requestQueue',
      [ContentPublishingQueues.PUBLISH_QUEUE_NAME]: 'bull:publishQueue',
      [ContentPublishingQueues.BATCH_QUEUE_NAME]: 'bull:batchQueue',
    };

    const redisKey = keysMap[queueName];
    if (!redisKey) {
      this.logger.warn(`Queue not found: ${queueName}`);
    }
    return redisKey;
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
