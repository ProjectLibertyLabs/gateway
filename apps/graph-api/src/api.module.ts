import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { GraphControllerV1 } from './controllers/v1/graph-v1.controller';
import { HealthController } from './controllers/health.controller';
import { ApiService } from './api.service';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';
import { WebhooksControllerV1 } from './controllers/v1/webhooks-v1.controller';
import { QueueModule } from '#graph-lib/queues/queue.module';
import { BlockchainModule } from '#graph-lib/blockchain';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { CacheModule } from '#graph-lib/cache/cache.module';
import cacheConfig, { ICacheConfig } from '#graph-lib/cache/cache.config';
import { ConfigModule } from '@nestjs/config';
import apiConfig from './api.config';
import { allowReadOnly } from '#graph-lib/blockchain/blockchain.config';
import queueConfig from '#graph-lib/queues/queue.config';
import scannerConfig from '#graph-worker/graph_notifier/scanner.config';
import { AsyncDebouncerService } from '#graph-lib/services/async_debouncer';
import graphCommonConfig from '#config/graph-common.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [apiConfig, graphCommonConfig, allowReadOnly, cacheConfig, queueConfig, scannerConfig],
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
    BlockchainModule,
    CacheModule.forRootAsync({
      useFactory: (cacheConf: ICacheConfig) => [
        {
          url: cacheConf.redisUrl,
          keyPrefix: cacheConf.cacheKeyPrefix,
        },
      ],
      inject: [cacheConfig.KEY],
    }),
    QueueModule,
    // Bullboard UI
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.RECONNECT_REQUEST_QUEUE,
      adapter: BullMQAdapter,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [ApiService, GraphStateManager, AsyncDebouncerService],
  controllers: [GraphControllerV1, WebhooksControllerV1, HealthController],
  exports: [],
})
export class ApiModule {}
