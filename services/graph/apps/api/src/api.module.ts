import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@songkeys/nestjs-redis';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { GraphControllerV1 } from './controllers/v1/graph-v1.controller';
import { HealthController } from './controllers/health.controller';
import { ApiService } from './api.service';
import { BlockchainModule, ConfigModule, ConfigService, GraphStateManager } from '#lib';
import * as QueueConstants from '#lib/queues/queue-constants';
import { WebhooksControllerV1 } from './controllers/v1/webhooks-v1.controller';
import { QueueModule } from '#lib/queues/queue.module';

@Module({
  imports: [
    ConfigModule,
    BlockchainModule,
    RedisModule.forRootAsync(
      {
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          config: [{ url: configService.redisUrl.toString(), keyPrefix: configService.cacheKeyPrefix }],
        }),
        inject: [ConfigService],
      },
      true, // isGlobal
    ),
    QueueModule,
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
  providers: [ApiService, GraphStateManager, ConfigService],
  controllers: [GraphControllerV1, WebhooksControllerV1, HealthController],
  exports: [],
})
export class ApiModule {}
