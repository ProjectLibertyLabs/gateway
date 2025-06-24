import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { DevelopmentControllerV1 } from './controllers/v1/development.controller.v1';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';
import { ApiService } from './api.service';
import { HealthCheckModule } from '#health-check/health-check.module';
import { HealthController } from './controllers/health.controller';
import { AssetControllerV1, ContentControllerV1, ProfileControllerV1 } from './controllers/v1';
import { CacheModule } from '#cache/cache.module';
import { ConfigModule } from '@nestjs/config';
import apiConfig, { IContentPublishingApiConfig } from './api.config';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import { QueueModule } from '#queue/queue.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '#utils/filters/exceptions.filter';
import { ContentControllerV2 } from './controllers/v2';
import { ContentControllerV3 } from './controllers/v3';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { allowReadOnly } from '#blockchain/blockchain.config';
import ipfsConfig from '#storage/ipfs/ipfs.config';
import httpCommonConfig from '#config/http-common.config';
import { AssetControllerV2 } from './controllers/v2/asset.controller.v2';
import { IPFSStorageModule } from '#storage';
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [apiConfig, allowReadOnly, cacheConfig, ipfsConfig, httpCommonConfig],
    }),
    BlockchainModule.forRootAsync({ readOnly: true }),
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
    QueueModule.forRoot({ enableUI: true, ...QueueConstants.CONFIGURED_QUEUES }),
    ScheduleModule.forRoot(),
    MulterModule.registerAsync({
      useFactory: async (apiConf: IContentPublishingApiConfig) => ({
        limits: {
          fileSize: apiConf.fileUploadMaxSizeBytes,
          files: apiConf.fileUploadCountLimit,
        },
      }),
      inject: [apiConfig.KEY],
    }),
    IPFSStorageModule,
    HealthCheckModule,
  ],
  providers: [
    ApiService,
    // global exception handling
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  // Controller order determines the order of display for docs
  // v[Desc first][ABC Second], Health, and then Dev only last
  controllers:
    process.env?.ENVIRONMENT === 'dev'
      ? [
          AssetControllerV1,
          AssetControllerV2,
          ContentControllerV1,
          ContentControllerV2,
          ProfileControllerV1,
          HealthController,
          DevelopmentControllerV1,
        ]
      : [
          AssetControllerV1,
          AssetControllerV2,
          ContentControllerV1,
          ContentControllerV2,
          ContentControllerV3,
          ProfileControllerV1,
          HealthController,
        ],
  exports: [],
})
export class ApiModule {}
