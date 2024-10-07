import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BlockchainModule } from '#account-lib/blockchain/blockchain.module';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { CacheModule } from '#cache/cache.module';
import {
  AccountsControllerV1,
  AccountsControllerV2,
  DelegationControllerV1,
  HandlesControllerV1,
  KeysControllerV1,
  DelegationsControllerV2,
  HealthController,
} from './controllers';
import { AccountsService, HandlesService, DelegationService, KeysService, SiwfV2Service } from './services';
import { ConfigModule } from '@nestjs/config';
import { allowReadOnly } from '#account-lib/blockchain/blockchain.config';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import queueConfig, { QueueModule } from '#queue';
import apiConfig from './api.config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '#utils/filters/exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [apiConfig, allowReadOnly, cacheConfig, queueConfig] }),
    BlockchainModule,
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
    CacheModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cacheConf: ICacheConfig) => [
        {
          url: cacheConf.redisUrl,
          keyPrefix: cacheConf.cacheKeyPrefix,
          maxRetriesPerRequest: null,
        },
      ],
      inject: [cacheConfig.KEY],
    }),
    QueueModule.forRoot({ enableUI: true, ...QueueConstants.CONFIGURED_QUEUES }),
    ScheduleModule.forRoot(),
  ],
  providers: [
    AccountsService,
    DelegationService,
    EnqueueService,
    HandlesService,
    KeysService,
    SiwfV2Service,
    // global exception handling
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  // Controller order determines the order of display for docs
  // v[Desc first][ABC Second], Health, and then Dev only last
  controllers: [
    AccountsControllerV2,
    AccountsControllerV1,
    DelegationsControllerV2,
    DelegationControllerV1,
    HandlesControllerV1,
    KeysControllerV1,
    HealthController,
  ],
  exports: [],
})
export class ApiModule {}
