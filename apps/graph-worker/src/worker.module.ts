import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { GraphNotifierModule } from './graph_notifier/graph.monitor.processor.module';
import { GraphUpdatePublisherModule } from './graph_publisher/graph.publisher.processor.module';
import { RequestProcessorModule } from './request_processor/request.processor.module';
import { GraphQueues as QueueConstants } from '#types/constants';
import { CacheModule } from '#cache/cache.module';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from '#blockchain/blockchain.config';
import { ConfigModule } from '@nestjs/config';
import workerConfig from './worker.config';
import scannerConfig from './graph_notifier/scanner.config';
import graphCommonConfig from '#config/graph-common.config';
import { QueueModule } from '#queue/queue.module';
import { NONCE_SERVICE_REDIS_NAMESPACE } from '#blockchain/blockchain.service';
import httpCommonConfig from '#config/http-common.config';
import { LoggerModule } from 'nestjs-pino';
import { createPrometheusConfig, getPinoHttpOptions } from '#logger-lib';
import { PrometheusModule } from '@willsoto/nestjs-prometheus/dist/module';
import { HealthCheckModule } from '#health-check/health-check.module';
import { HealthController } from './health_check/health.controller';
import { ThrottlerModule } from '@nestjs/throttler';
import { createRateLimitingConfig, IRateLimitingConfig } from '#config';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

const configs = [workerConfig, graphCommonConfig, blockchainConfig, cacheConfig, scannerConfig, httpCommonConfig];
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
      maxListeners: 20,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: true,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    QueueModule.forRoot(QueueConstants.CONFIGURED_QUEUES),
    CacheModule.forRootAsync({
      useFactory: (cacheConf: ICacheConfig, blockchainConf: IBlockchainConfig) => [
        {
          ...cacheConf.redisOptions,
          keyPrefix: cacheConf.cacheKeyPrefix,
        },
        {
          ...cacheConf.redisOptions,
          namespace: NONCE_SERVICE_REDIS_NAMESPACE,
          keyPrefix: `${NONCE_SERVICE_REDIS_NAMESPACE}:${addressFromSeedPhrase(blockchainConf.providerKeyUriOrPrivateKey)}:`,
        },
      ],
      inject: [cacheConfig.KEY, blockchainConfig.KEY],
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
      inject: [createRateLimitingConfig('graph-worker').KEY, cacheConfig.KEY],
    }),
    ScheduleModule.forRoot(),
    BlockchainModule.forRootAsync(),
    RequestProcessorModule,
    GraphUpdatePublisherModule,
    GraphNotifierModule,
    PrometheusModule.register(createPrometheusConfig('account-worker')),
    HealthCheckModule.forRoot({ configKeys: configs.map(({ KEY }) => KEY.toString()) }),
  ],
  controllers: [HealthController],
  providers: [GraphStateManager],
  exports: [],
})
export class WorkerModule {}
