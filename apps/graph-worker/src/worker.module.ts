import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from '#graph-lib/blockchain';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { NONCE_SERVICE_REDIS_NAMESPACE } from '#graph-lib/services/nonce.service';
import { GraphNotifierModule } from './graph_notifier/graph.monitor.processor.module';
import { GraphUpdatePublisherModule } from './graph_publisher/graph.publisher.processor.module';
import { RequestProcessorModule } from './request_processor/request.processor.module';
import { GraphQueues as QueueConstants } from '#types/constants';
import { CacheModule } from '#cache/cache.module';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from '#graph-lib/blockchain/blockchain.config';
import { ConfigModule } from '@nestjs/config';
import workerConfig from './worker.config';
import queueConfig, { QueueModule } from '#queue';
import scannerConfig from './graph_notifier/scanner.config';
import graphReconnectionConfig from './reconnection_processor/graph.reconnection.config';
import graphCommonConfig from '#config/graph-common.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        workerConfig,
        graphCommonConfig,
        blockchainConfig,
        cacheConfig,
        queueConfig,
        scannerConfig,
        graphReconnectionConfig,
      ],
    }),
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
    QueueModule.forRoot(QueueConstants.CONFIGURED_QUEUES),
    CacheModule.forRootAsync({
      useFactory: (cacheConf: ICacheConfig, blockchainConf: IBlockchainConfig) => [
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
      inject: [cacheConfig.KEY, blockchainConfig.KEY],
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
