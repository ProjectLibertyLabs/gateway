import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { RedisStatusDto, QueueStatusDto, BlockchainStatusDto, LatestBlockHeader } from '#types/dtos/common';

import { plainToInstance } from 'class-transformer';
import fs from 'fs';

import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

import {
  QUEUE_PREFIX,
  AccountQueues,
  ContentPublishingQueues,
  ContentWatcherQueues,
  GraphQueues,
} from '#types/constants/queue.constants';

type QueueName =
  | AccountQueues.QueueName
  | ContentPublishingQueues.QueueName
  | ContentWatcherQueues.QueueName
  | GraphQueues.QueueName;

interface RedisWithCustomCommands extends Redis {
  queueStatus(prefixes: string[]): Promise<string>;
}

@Injectable()
export class HealthCheckService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: RedisWithCustomCommands,
    private readonly configService: ConfigService,
    private blockchainService: BlockchainRpcQueryService,
  ) {
    this.initializeRedisCommands();
    this.redisWithCommands = redis as RedisWithCustomCommands;
    this.logger = pino(getBasicPinoOptions(this.constructor.name));
  }

  private redisWithCommands: RedisWithCustomCommands;

  private initializeRedisCommands(): void {
    this.redis.defineCommand('queueStatus', {
      numberOfKeys: 0,
      lua: fs.readFileSync('lua/queueStatus.lua', 'utf8'),
    });
  }

  public async getRedisStatus(queueNames: Array<QueueName>): Promise<RedisStatusDto> {
    const queuePrefixes = queueNames.map((queueName) => `${QUEUE_PREFIX}:${queueName}`).filter(Boolean);
    if (queuePrefixes.length === 0) {
      this.logger.warn('No valid queue prefixes found for status check');
    }
    try {
      const result = await this.redisWithCommands.queueStatus(queuePrefixes);

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
      return HealthCheckService.createEmptyRedisStatus();
    }
  }

  private static createEmptyRedisStatus(): RedisStatusDto {
    return plainToInstance(RedisStatusDto, {
      redis_version: null,
      used_memory: null,
      maxmemory: null,
      uptime_in_seconds: null,
      connected_clients: null,
      queues: [],
    });
  }

  public async getBlockchainStatus(): Promise<BlockchainStatusDto> {
    return plainToInstance(BlockchainStatusDto, {
      frequencyApiWsUrl: this.configService.get<string>('FREQUENCY_API_WS_URL'),
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

  public getServiceConfig<T = unknown>(serviceName: string): T {
    return this.configService.get<T>(serviceName);
  }
}
