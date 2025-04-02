import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { ProviderWebhookService } from '#account-lib/services/provider-webhook.service';
import { TxnNotifierModule } from './transaction_notifier/notifier.module';
import { TransactionPublisherModule } from './transaction_publisher/publisher.module';
import { CacheModule } from '#cache/cache.module';
import { ConfigModule } from '@nestjs/config';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from '#blockchain/blockchain.config';
import queueConfig from '#queue';
import { QueueModule } from '#queue/queue.module';
import workerConfig from './worker.config';
import { NONCE_SERVICE_REDIS_NAMESPACE } from '#blockchain/blockchain.service';
import httpConfig from '#config/http-common.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [blockchainConfig, cacheConfig, queueConfig, workerConfig, httpConfig],
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
      useFactory: async (blockchainConf: IBlockchainConfig, cacheConf: ICacheConfig) => [
        {
          ...cacheConf.redisOptions,
          url: cacheConf.redisUrl.toString(),
          keyPrefix: cacheConf.cacheKeyPrefix,
        },
        {
          ...cacheConf.redisOptions,
          url: cacheConf.redisUrl.toString(),
          namespace: NONCE_SERVICE_REDIS_NAMESPACE,
          keyPrefix: `${NONCE_SERVICE_REDIS_NAMESPACE}:${await addressFromSeedPhrase(blockchainConf.providerSeedPhrase)}:`,
        },
      ],
      inject: [blockchainConfig.KEY, cacheConfig.KEY],
    }),
    ScheduleModule.forRoot(),
    BlockchainModule.forRootAsync(),
    TransactionPublisherModule,
    TxnNotifierModule,
  ],
  providers: [ProviderWebhookService],
  exports: [EventEmitterModule],
})
export class WorkerModule {}
