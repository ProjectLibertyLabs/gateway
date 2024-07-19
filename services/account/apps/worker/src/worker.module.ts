import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { BlockchainModule } from '#lib/blockchain/blockchain.module';
import { NonceService } from '#lib/services/nonce.service';
import { ProviderWebhookService } from '#lib/services/provider-webhook.service';
import { QueueConstants } from '#lib/utils/queues';
import { ConfigModule } from '#lib/config/config.module';
import { ConfigService } from '#lib/config/config.service';
import { redisEventsToEventEmitter } from '#lib/utils/redis';
import { TxnNotifierModule } from './transaction_notifier/notifier.module';
import { TransactionPublisherModule } from './transaction_publisher/publisher.module';

@Module({
  imports: [
    ConfigModule,
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
        connection: new Redis(configService.redisUrl.toString(), { maxRetriesPerRequest: null }),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QueueConstants.TRANSACTION_PUBLISH_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: false,
        attempts: 1,
      },
    }),
    ScheduleModule.forRoot(),
    BlockchainModule,
    TransactionPublisherModule,
    TxnNotifierModule,
  ],
  providers: [ProviderWebhookService, NonceService],
  exports: [],
})
export class WorkerModule {}
