import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ConfigModule } from '#lib/config/config.module';
import { ConfigService } from '#lib/config/config.service';
import { BlockchainModule } from '#lib/blockchain/blockchain.module';
import { redisEventsToEventEmitter } from '#lib/utils/redis';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { QueueModule, QueueConstants } from '#lib/queues';
import { AccountsControllerV1, DelegationControllerV1, HandlesControllerV1, KeysControllerV1, HealthController } from './controllers';
import { ApiService, AccountsService, HandlesService, DelegationService, KeysService } from './services';

@Module({
  imports: [
    ConfigModule,
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
    RedisModule.forRootAsync(
      {
        imports: [ConfigModule, EventEmitterModule],
        useFactory: (configService: ConfigService, eventEmitter: EventEmitter2) => ({
          config: [
            {
              url: configService.redisUrl.toString(),
              keyPrefix: configService.cacheKeyPrefix,
              maxRetriesPerRequest: null,
              onClientCreated(client) {
                redisEventsToEventEmitter(client, eventEmitter);
              },
              readyLog: false,
              errorLog: false,
            },
          ],
        }),
        inject: [ConfigService, EventEmitter2],
      },
      true, // isGlobal
    ),
    QueueModule.forRoot(),
    // Bullboard UI
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.TRANSACTION_PUBLISH_QUEUE,
      adapter: BullMQAdapter,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [ApiService, AccountsService, HandlesService, DelegationService, KeysService, EnqueueService],
  // Controller order determines the order of display for docs
  // v[Desc first][ABC Second], Health, and then Dev only last
  controllers: [AccountsControllerV1, DelegationControllerV1, HandlesControllerV1, KeysControllerV1, HealthController],
  exports: [],
})
export class ApiModule {}
