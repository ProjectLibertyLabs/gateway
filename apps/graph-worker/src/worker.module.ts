import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '#graph-lib/config';
import { BlockchainModule } from '#graph-lib/blockchain';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { NONCE_SERVICE_REDIS_NAMESPACE } from '#graph-lib/services/nonce.service';
import { QueueModule } from '#graph-lib/queues/queue.module';
import { GraphNotifierModule } from './graph_notifier/graph.monitor.processor.module';
import { GraphUpdatePublisherModule } from './graph_publisher/graph.publisher.processor.module';
import { RequestProcessorModule } from './request_processor/request.processor.module';
import { CacheModule } from '#graph-lib/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
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
    QueueModule,
    CacheModule.forRootAsync({
      useFactory: (configService: ConfigService) => [
        {
          url: configService.redisUrl.toString(),
          keyPrefix: configService.cacheKeyPrefix,
        },
        {
          namespace: NONCE_SERVICE_REDIS_NAMESPACE,
          url: configService.redisUrl.toString(),
          keyPrefix: `${NONCE_SERVICE_REDIS_NAMESPACE}:${configService.providerPublicKeyAddress}:`,
        },
      ],
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    BlockchainModule,
    RequestProcessorModule,
    GraphUpdatePublisherModule,
    GraphNotifierModule,
  ],
  providers: [GraphStateManager],
  exports: [],
})
export class WorkerModule {}
