import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ConfigModule } from '#lib/config/config.module';
import { ConfigService } from '#lib/config/config.service';
import { BlockchainModule } from '#lib/blockchain/blockchain.module';
import { QueueConstants } from '#lib/utils/queues';
import { redisEventsToEventEmitter } from '#lib/utils/redis';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { Redis } from 'ioredis';
import { AccountsController } from './controllers/accounts.controller';
import { ApiController } from './controllers/api.controller';
import { DelegationController } from './controllers/delegation.controller';
import { HandlesController } from './controllers/handles.controller';
import { KeysController } from './controllers/keys.controller';
import { AccountsService } from './services/accounts.service';
import { ApiService } from './services/api.service';
import { DelegationService } from './services/delegation.service';
import { HandlesService } from './services/handles.service';
import { KeysService } from './services/keys.service';

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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: new Redis(configService.redisUrl.toString()),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: QueueConstants.TRANSACTION_PUBLISH_QUEUE,
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: false,
          attempts: 1,
        },
      },
      {
        name: QueueConstants.TRANSACTION_NOTIFY_QUEUE,
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: false,
          attempts: 3,
        },
      },
    ),
    // Bullboard UI
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.TRANSACTION_PUBLISH_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.TRANSACTION_NOTIFY_QUEUE,
      adapter: BullMQAdapter,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [
    ApiService,
    AccountsService,
    HandlesService,
    DelegationService,
    KeysService,
    ConfigService,
    EnqueueService,
  ],
  controllers: [ApiController, AccountsController, DelegationController, KeysController, HandlesController],
  exports: [],
})
export class ApiModule {}
