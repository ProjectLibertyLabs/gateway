import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { GraphControllerV1 } from './controllers/v1/graphs-v1.controller';
import { HealthController } from './controllers/health.controller';
import { ApiService } from './api.service';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';
import { WebhooksControllerV1 } from './controllers/v1/webhooks-v1.controller';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { BlockInfoController } from '#blockchain/blockinfo.controller';
import { HealthCheckModule } from '#health-check/health-check.module';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { CacheModule } from '#cache/cache.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import { ConfigModule } from '@nestjs/config';
import apiConfig from './api.config';
import { allowReadOnly } from '#blockchain/blockchain.config';
import { QueueModule } from '#queue/queue.module';
import scannerConfig from '#graph-worker/graph_notifier/scanner.config';
import { AsyncDebouncerService } from '#graph-lib/services/async_debouncer';
import graphCommonConfig from '#config/graph-common.config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '#utils/filters/exceptions.filter';
import { EncryptionService } from '#graph-lib/services/encryption.service';
import { LoggerModule } from 'nestjs-pino';
import { createPrometheusConfig, getPinoHttpOptions } from '#logger-lib';
import { ThrottlerModule } from '@nestjs/throttler';
import { createRateLimitingConfig, IRateLimitingConfig } from '#config';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

const configs = [apiConfig, allowReadOnly, cacheConfig, scannerConfig, graphCommonConfig];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
    }),
    EventEmitterModule.forRoot({
      // Use this instance throughout the application
      global: true,
      // set this to `true` to use wildcards
      wildcard: false,
      // the delimiter used to segment namespaces
      delimiter: '.',
      // set this to `true` if you want to emit the newListener event
      newListener: false,
      // set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    BlockchainModule.forRootAsync({ readOnly: true }),
    CacheModule.forRootAsync({
      useFactory: (cacheConf: ICacheConfig) => [
        {
          ...cacheConf.redisOptions,
          keyPrefix: cacheConf.cacheKeyPrefix,
        },
      ],
      inject: [cacheConfig.KEY],
    }),
    LoggerModule.forRoot(getPinoHttpOptions()),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (rateLimitConfig: IRateLimitingConfig, cacheConf: ICacheConfig) => ({
        throttlers: [
          {
            name: 'default',
            ttl: rateLimitConfig.ttl,
            limit: rateLimitConfig.limit,
          },
        ],
        storage: new ThrottlerStorageRedisService({
          host: cacheConf.redisOptions.host,
          port: cacheConf.redisOptions.port,
          ...(cacheConf.redisOptions.password && { password: cacheConf.redisOptions.password }),
          ...(cacheConf.redisOptions.username && { username: cacheConf.redisOptions.username }),
          keyPrefix: rateLimitConfig.keyPrefix,
        }),
        skipIf: (context) => {
          const response = context.switchToHttp().getResponse();

          // Apply configurable skip rules
          if (rateLimitConfig.skipSuccessfulRequests && response.statusCode < 400) {
            return true;
          }

          if (rateLimitConfig.skipFailedRequests && response.statusCode >= 400) {
            return true;
          }

          return false;
        },
      }),
      inject: [createRateLimitingConfig('graph').KEY, cacheConfig.KEY],
    }),
    QueueModule.forRoot({ enableUI: true, ...QueueConstants.CONFIGURED_QUEUES }),
    ScheduleModule.forRoot(),
    PrometheusModule.register(createPrometheusConfig('graph-api')),
    HealthCheckModule.forRoot({ configKeys: configs.map((c) => c.KEY) }),
  ],
  providers: [
    ApiService,
    GraphStateManager,
    AsyncDebouncerService,
    EncryptionService,
    // global exception handling
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  controllers: [GraphControllerV1, WebhooksControllerV1, HealthController, BlockInfoController],
  exports: [],
})
export class ApiModule {}
