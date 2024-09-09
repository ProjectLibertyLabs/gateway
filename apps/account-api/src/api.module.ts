import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ConfigModule } from '#account-lib/config/config.module';
import { ConfigService } from '#account-lib/config/config.service';
import { BlockchainModule } from '#account-lib/blockchain/blockchain.module';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { QueueModule, QueueConstants } from '#account-lib/queues';
import { CacheModule } from '#account-lib/cache/cache.module';
import {
  AccountsControllerV1,
  DelegationControllerV1,
  HandlesControllerV1,
  KeysControllerV1,
  HealthController,
} from './controllers';
import { AccountsService, HandlesService, DelegationService, KeysService } from './services';

@Module({
  imports: [
    ConfigModule.forRoot(true), // allowReadOnly
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
      useFactory: (configService: ConfigService) => [
        {
          url: configService.redisUrl.toString(),
          keyPrefix: configService.cacheKeyPrefix,
          maxRetriesPerRequest: null,
        },
      ],
      inject: [ConfigService],
    }),
    QueueModule,
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
  providers: [AccountsService, DelegationService, EnqueueService, HandlesService, KeysService],
  // Controller order determines the order of display for docs
  // v[Desc first][ABC Second], Health, and then Dev only last
  controllers: [AccountsControllerV1, DelegationControllerV1, HandlesControllerV1, KeysControllerV1, HealthController],
  exports: [],
})
export class ApiModule {}
