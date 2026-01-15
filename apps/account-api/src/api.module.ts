import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { BlockInfoController } from '#blockchain/blockinfo.controller';
import { HealthCheckModule } from '#health-check/health-check.module';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { CacheModule } from '#cache/cache.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  AccountsControllerV1,
  AccountsControllerV2,
  HandlesControllerV1,
  KeysControllerV1,
  HealthController,
} from './controllers';
import { AccountsService, HandlesService, DelegationService, KeysService, SiwfV2Service } from './services';
import { ConfigModule } from '@nestjs/config';
import { allowReadOnly } from '#blockchain/blockchain.config';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import apiConfig from './api.config';
import { createRateLimitingConfig, createThrottlerConfig } from '#config/rate-limiting.config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from '#utils/filters/exceptions.filter';
import { QueueModule } from '#queue/queue.module';
import { createPrometheusConfig, getPinoHttpOptions } from '#logger-lib';
import { DelegationsControllerV3 } from '#account-api/controllers/v3';
import { DecoratorsModule } from '#utils/decorators/decorators.module';

const configs = [apiConfig, allowReadOnly, cacheConfig, createRateLimitingConfig('account')];
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: configs }),
    BlockchainModule.forRootAsync({ readOnly: true }),
    DecoratorsModule,
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
          ...cacheConf.redisOptions,
          keyPrefix: cacheConf.cacheKeyPrefix,
          maxRetriesPerRequest: null,
        },
      ],
      inject: [cacheConfig.KEY],
    }),
    // just use default pino options
    LoggerModule.forRoot(getPinoHttpOptions()),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createThrottlerConfig,
      inject: [createRateLimitingConfig('account').KEY, cacheConfig.KEY],
    }),
    QueueModule.forRoot({ enableUI: true, ...QueueConstants.CONFIGURED_QUEUES }),
    ScheduleModule.forRoot(),
    PrometheusModule.register(createPrometheusConfig('account-api')),
    HealthCheckModule.forRoot({ configKeys: configs.map((c) => c.KEY) }),
  ],
  providers: [
    AccountsService,
    DelegationService,
    EnqueueService,
    HandlesService,
    KeysService,
    SiwfV2Service,
    // Global rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
    DelegationsControllerV3,
    HandlesControllerV1,
    KeysControllerV1,
    HealthController,
    BlockInfoController,
  ],
  exports: [],
})
export class ApiModule {}
