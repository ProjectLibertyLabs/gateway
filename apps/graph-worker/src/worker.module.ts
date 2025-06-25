import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { GraphNotifierModule } from './graph_notifier/graph.monitor.processor.module';
import { GraphUpdatePublisherModule } from './graph_publisher/graph.publisher.processor.module';
import { RequestProcessorModule } from './request_processor/request.processor.module';
import { GraphQueues as QueueConstants } from '#types/constants';
import { CacheModule } from '#cache/cache.module';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from '#blockchain/blockchain.config';
import { ConfigModule } from '@nestjs/config';
import workerConfig from './worker.config';
import scannerConfig from './graph_notifier/scanner.config';
import graphCommonConfig from '#config/graph-common.config';
import { QueueModule } from '#queue/queue.module';
import { NONCE_SERVICE_REDIS_NAMESPACE } from '#blockchain/blockchain.service';
import httpCommonConfig from '#config/http-common.config';
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [workerConfig, graphCommonConfig, blockchainConfig, cacheConfig, scannerConfig, httpCommonConfig],
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
          ...cacheConf.redisOptions,
          keyPrefix: cacheConf.cacheKeyPrefix,
        },
        {
          ...cacheConf.redisOptions,
          namespace: NONCE_SERVICE_REDIS_NAMESPACE,
          keyPrefix: `${NONCE_SERVICE_REDIS_NAMESPACE}:${addressFromSeedPhrase(blockchainConf.providerKeyUriOrPrivateKey)}:`,
        },
      ],
      inject: [cacheConfig.KEY, blockchainConfig.KEY],
    }),
    LoggerModule.forRoot(getPinoHttpOptions()),
    ScheduleModule.forRoot(),
    BlockchainModule.forRootAsync(),
    RequestProcessorModule,
    GraphUpdatePublisherModule,
    GraphNotifierModule,
  ],
  providers: [GraphStateManager],
  exports: [],
})
export class WorkerModule {}
