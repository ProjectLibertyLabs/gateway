import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@songkeys/nestjs-redis';
import { BlockchainModule, ConfigModule, ConfigService, GraphStateManager } from '#lib';
import { GraphNotifierModule } from './graph_notifier/graph.monitor.processor.module';
import { GraphNotifierService } from './graph_notifier/graph.monitor.processor.service';
import { GraphUpdatePublisherModule } from './graph_publisher/graph.publisher.processor.module';
import { GraphUpdatePublisherService } from './graph_publisher/graph.publisher.processor.service';
import { RequestProcessorModule } from './request_processor/request.processor.module';
import { RequestProcessorService } from './request_processor/request.processor.service';
import { QueueModule } from '#lib/queues/queue.module';

@Module({
  imports: [
    ConfigModule,
    QueueModule,
    RedisModule.forRootAsync(
      {
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          config: [{ url: configService.redisUrl.toString() }],
        }),
        inject: [ConfigService],
      },
      true, // isGlobal
    ),
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
    ScheduleModule.forRoot(),
    BlockchainModule,
    RequestProcessorModule,
    GraphUpdatePublisherModule,
    GraphNotifierModule,
  ],
  providers: [
    RequestProcessorService,
    GraphUpdatePublisherService,
    GraphNotifierService,
    GraphStateManager,
  ],
})
export class WorkerModule {}
