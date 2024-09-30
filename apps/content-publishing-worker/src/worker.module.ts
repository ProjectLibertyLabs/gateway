import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PublisherModule } from './publisher/publisher.module';
import { BlockchainModule } from '#content-publishing-lib/blockchain/blockchain.module';
import { AssetProcessorModule } from './asset_processor/asset.processor.module';
import { BatchAnnouncerModule } from './batch_announcer/batch.announcer.module';
import { BatchingProcessorModule } from './batching_processor/batching.processor.module';
import { StatusMonitorModule } from './monitor/status.monitor.module';
import { RequestProcessorModule } from './request_processor/request.processor.module';
import { NONCE_SERVICE_REDIS_NAMESPACE } from './publisher/nonce.service';
import { CacheModule } from '#cache/cache.module';
import { ConfigModule } from '@nestjs/config';
import blockchainConfig, { addressFromSeedPhrase } from '#content-publishing-lib/blockchain/blockchain.config';
import queueConfig, { QueueModule } from '#queue';
import cacheConfig from '#cache/cache.config';
import ipfsConfig from '#content-publishing-lib/config/ipfs.config';
import workerConfig from './worker.config';
import { ContentPublishingQueues as QueueConstants } from '#types/constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [blockchainConfig, cacheConfig, queueConfig, ipfsConfig, workerConfig],
    }),
    CacheModule.forRootAsync({
      useFactory: (blockchainConf, cacheConf) => [
        {
          url: cacheConf.redisUrl.toString(),
          keyPrefix: cacheConf.cacheKeyPrefix,
        },
        {
          namespace: NONCE_SERVICE_REDIS_NAMESPACE,
          url: cacheConf.redisUrl.toString(),
          keyPrefix: `${NONCE_SERVICE_REDIS_NAMESPACE}:${addressFromSeedPhrase(blockchainConf.providerSeedPhrase)}:`,
        },
      ],
      inject: [blockchainConfig.KEY, cacheConfig.KEY],
    }),
    QueueModule.forRoot(QueueConstants.CONFIGURED_QUEUES),
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
  providers: [],
})
export class WorkerModule {}
