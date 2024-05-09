import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@songkeys/nestjs-redis';
import { PublishingService } from './publisher/publishing.service';
import { PublisherModule } from './publisher/publisher.module';
import { BlockchainModule } from '../../../libs/common/src/blockchain/blockchain.module';
import { BatchAnnouncementService } from './batch_announcer/batch.announcer.service';
import { BatchAnnouncerModule } from './batch_announcer/batch.announcer.module';
import { StatusMonitorModule } from './monitor/status.monitor.module';
import { TxStatusMonitoringService } from './monitor/tx.status.monitor.service';
import { AssetProcessorModule } from './asset_processor/asset.processor.module';
import { AssetProcessorService } from './asset_processor/asset.processor.service';
import { RequestProcessorModule } from './request_processor/request.processor.module';
import { RequestProcessorService } from './request_processor/request.processor.service';
import { BatchingProcessorModule } from './batching_processor/batching.processor.module';
import { ConfigModule } from '../../../libs/common/src/config/config.module';
import { ConfigService } from '../../../libs/common/src/config/config.service';

@Module({
  imports: [
    BullModule,
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
    PublisherModule,
    BlockchainModule,
    BatchAnnouncerModule,
    StatusMonitorModule,
    AssetProcessorModule,
    RequestProcessorModule,
    BatchingProcessorModule,
  ],
  providers: [BatchAnnouncementService, ConfigService, PublishingService, TxStatusMonitoringService, AssetProcessorService, RequestProcessorService],
})
export class WorkerModule {}
