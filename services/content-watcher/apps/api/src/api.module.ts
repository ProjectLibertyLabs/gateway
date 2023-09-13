import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { ApiController } from './api.controller';
import { DevelopmentController } from './development.controller';
import { QueueConstants } from '../../../libs/common/src';
import { ApiService } from './api.service';
import { IpfsService } from '../../../libs/common/src/utils/ipfs.client';
import { ConfigModule } from '../../../libs/common/src/config/config.module';
import { ConfigService } from '../../../libs/common/src/config/config.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        enableOfflineQueue: false,
      },
    }),
    BullModule.registerQueue({
      name: QueueConstants.REQUEST_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.ASSET_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.BROADCAST_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.REPLY_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.REACTION_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.TOMBSTONE_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.UPDATE_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.PROFILE_QUEUE_NAME,
    }),
    ConfigModule,
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
  ],
  providers: [ConfigService, ApiService, IpfsService],
  controllers: process.env?.ENVIRONMENT === 'dev' ? [DevelopmentController, ApiController] : [ApiController],
  exports: [],
})
export class ApiModule {}
