import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PublisherModule } from './publisher/publisher.module';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { AssetProcessorModule } from './asset_processor/asset.processor.module';
import { BatchAnnouncerModule } from './batch_announcer/batch.announcer.module';
import { BatchingProcessorModule } from './batching_processor/batching.processor.module';
import { StatusMonitorModule } from './monitor/status.monitor.module';
import { RequestProcessorModule } from './request_processor/request.processor.module';
import { CacheModule } from '#cache/cache.module';
import { HealthCheckModule } from '#health-check/health-check.module';
import { HealthController } from './health_check/health.controller';
import { PrometheusModule } from '@willsoto/nestjs-prometheus/dist/module';
import { ConfigModule } from '@nestjs/config';
import blockchainConfig, { addressFromSeedPhrase } from '#blockchain/blockchain.config';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import ipfsConfig from '#storage/ipfs/ipfs.config';
import workerConfig from './worker.config';
import { ContentPublishingQueues as QueueConstants } from '#types/constants';
import { QueueModule } from '#queue/queue.module';
import { NONCE_SERVICE_REDIS_NAMESPACE } from '#blockchain/blockchain.service';
import { IpfsService } from '#storage';
import httpCommonConfig from '#config/http-common.config';
import { LoggerModule } from 'nestjs-pino';
import { createPrometheusConfig, getPinoHttpOptions } from '#logger-lib';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { createRateLimitingConfig, IRateLimitingConfig } from '#config';

const configs = [blockchainConfig, cacheConfig, ipfsConfig, workerConfig, httpCommonConfig];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
    }),
    CacheModule.forRootAsync({
      useFactory: (blockchainConf, cacheConf) => [
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
      inject: [blockchainConfig.KEY, cacheConfig.KEY],
    }),
    BlockchainModule.forRootAsync(),
    QueueModule.forRoot(QueueConstants.CONFIGURED_QUEUES),
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
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
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
      inject: [createRateLimitingConfig('content-publishing-worker').KEY, cacheConfig.KEY],
    }),
    ScheduleModule.forRoot(),
    PublisherModule,
    BatchAnnouncerModule,
    StatusMonitorModule,
    AssetProcessorModule,
    RequestProcessorModule,
    BatchingProcessorModule,
    PrometheusModule.register(createPrometheusConfig('content-publishing-worker')),
    HealthCheckModule.forRoot({ configKeys: configs.map(({ KEY }) => KEY.toString()) }),
  ],
  controllers: [HealthController],
  providers: [IpfsService],
  exports: [IpfsService],
})
export class WorkerModule {}
