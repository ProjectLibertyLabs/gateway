import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import {
  RedisStatusDto,
  QueueStatusDto,
  BlockchainStatusDto,
  LatestBlockHeader,
  HealthResponseDto,
  LoggingConfigDto,
  ReadinessResponseDto,
} from '#types/dtos/common';

import { plainToInstance } from 'class-transformer';
import fs from 'fs';

import { CONFIG_KEYS_TO_REDACT, HEALTH_CONFIGS } from '#types/constants/health-check.constants';
import { CONFIGURED_QUEUE_NAMES_PROVIDER, CONFIGURED_QUEUE_PREFIX_PROVIDER } from '#types/constants';
import * as process from 'node:process';
import { PinoLogger } from 'nestjs-pino';
import { withTimeoutMs } from '#utils/common/common.utils';

interface RedisWithCustomCommands extends Redis {
  queueStatus(prefixes: string[]): Promise<string>;
}

function sortObject(obj: any) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      // eslint-disable-next-line no-param-reassign
      result[key] = obj[key];
      return result;
    }, {});
}

@Injectable()
export class HealthCheckService {
  constructor(
    @InjectRedis() private redis: RedisWithCustomCommands,
    private readonly configService: ConfigService,
    private blockchainService: BlockchainRpcQueryService,
    @Inject(CONFIGURED_QUEUE_NAMES_PROVIDER) private readonly queueNames: string[],
    @Inject(CONFIGURED_QUEUE_PREFIX_PROVIDER) private readonly queuePrefix: string,
    @Inject(HEALTH_CONFIGS) private readonly registeredConfigs: any[],
    private readonly logger: PinoLogger,
  ) {
    this.initializeRedisCommands();
    this.redisWithCommands = redis as RedisWithCustomCommands;
    this.logger.setContext(this.constructor.name);
  }

  private redisWithCommands: RedisWithCustomCommands;

  private initializeRedisCommands(): void {
    this.redis.defineCommand('queueStatus', {
      numberOfKeys: 0,
      lua: fs.readFileSync('lua/queueStatus.lua', 'utf8'),
    });
  }

  private async getRedisStatus(): Promise<RedisStatusDto> {
    const queuePrefixes = this.queueNames.map((queueName) => `${this.queuePrefix}::${queueName}`).filter(Boolean);
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

  private async isRedisConnected(): Promise<boolean> {
    try {
      const pingResponse = await this.redis.ping();
      this.logger.debug(`Redis ping response: ${pingResponse}`);
      return pingResponse === 'PONG';
    } catch (error) {
      this.logger.error('Redis connection error:', error);
      return false;
    }
  }

  private async getBlockchainStatus(): Promise<BlockchainStatusDto> {
    return plainToInstance(BlockchainStatusDto, {
      frequencyApiWsUrl: this.configService.get<string>('FREQUENCY_API_WS_URL'),
      latestBlockHeader: await this.getLatestBlockHeader(),
    });
  }

  private async getLatestBlockHeader(): Promise<LatestBlockHeader | null> {
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

  // eslint-disable-next-line class-methods-use-this
  private getLogConfig(): LoggingConfigDto {
    return {
      logLevel: process.env?.LOG_LEVEL,
      prettyPrint: process.env?.PRETTY === 'true' || process.env?.PRETTY === '1',
    };
  }

  private async dependenciesReady(): Promise<boolean> {
    try {
      // Run checks in parallel with timeouts
      const [redisResult, blockchainResult] = await Promise.allSettled([
        withTimeoutMs(this.isRedisConnected(), 2000),
        withTimeoutMs(this.blockchainService.isReady(), 2000),
      ]);

      const isRedisConnected = redisResult.status === 'fulfilled' ? redisResult.value : false;
      const isBlockchainReady = blockchainResult.status === 'fulfilled' ? blockchainResult.value : false;

      if (redisResult.status === 'rejected') {
        this.logger.warn('Redis readiness check failed or timed out:', redisResult.reason);
      }
      if (blockchainResult.status === 'rejected') {
        this.logger.warn('Blockchain readiness check failed or timed out:', blockchainResult.reason);
      }

      return isRedisConnected && isBlockchainReady;
    } catch (error) {
      this.logger.error('Dependencies readiness check failed:', error);
      return false;
    }
  }

  public async getServiceStatus(): Promise<HealthResponseDto> {
    const [redisResult, blockchainResult] = await Promise.allSettled([
      this.getRedisStatus(),
      this.getBlockchainStatus(),
    ]);

    const config = {};
    this.registeredConfigs.forEach((cfg) => {
      Object.assign(config, cfg);
      CONFIG_KEYS_TO_REDACT.forEach((key) => {
        if (config[key]) {
          config[key] = '***REDACTED***';
        }
      });
    });

    return {
      status: HttpStatus.OK,
      message: 'Service is healthy',
      timestamp: Date.now(),
      loggingConfig: this.getLogConfig(),
      config: sortObject(config),
      redisStatus: redisResult.status === 'fulfilled' ? redisResult.value : null,
      blockchainStatus: blockchainResult.status === 'fulfilled' ? blockchainResult.value : null,
    };
  }

  public async getServiceReadiness(): Promise<ReadinessResponseDto> {
    const dependenciesReady = await this.dependenciesReady();
    let status = HttpStatus.OK;
    let message = 'Service is ready';
    if (!dependenciesReady) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Service is not ready';
    }

    return {
      status,
      message,
    };
  }
}
