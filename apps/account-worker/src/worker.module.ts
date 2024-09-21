import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockchainModule } from '#account-lib/blockchain/blockchain.module';
import { NONCE_SERVICE_REDIS_NAMESPACE, NonceService } from '#account-lib/services/nonce.service';
import { ProviderWebhookService } from '#account-lib/services/provider-webhook.service';
import { QueueModule } from '#account-lib/queues';
import { TxnNotifierModule } from './transaction_notifier/notifier.module';
import { TransactionPublisherModule } from './transaction_publisher/publisher.module';
import { CacheModule } from '#account-lib/cache/cache.module';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import cacheConfig, { ICacheConfig } from '#account-lib/cache/cache.config';
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from '#account-lib/blockchain/blockchain.config';
import { ConfigModule } from '#account-lib/config';
import queueConfig from '#account-lib/queues/queue.config';
import workerConfig from './worker.config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [blockchainConfig, cacheConfig, queueConfig, workerConfig],
    }),
    // NestConfigModule.forFeature(cacheConfig),
    // NestConfigModule.forFeature(blockchainConfig),
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
    QueueModule,
    CacheModule.forRootAsync({
      imports: [NestConfigModule],
      useFactory: (blockchainConf, cacheConf) => [
        {
          url: cacheConf.redisUrl.toString(),
          keyPrefix: cacheConf.cacheKeyPrefix,
        },
        {
          url: cacheConf.redisUrl.toString(),
          namespace: NONCE_SERVICE_REDIS_NAMESPACE,
          keyPrefix: `${NONCE_SERVICE_REDIS_NAMESPACE}:${addressFromSeedPhrase(blockchainConf.providerSeedPhrase)}:`,
        },
      ],
      inject: [blockchainConfig.KEY, cacheConfig.KEY],
    }),
    ScheduleModule.forRoot(),
    BlockchainModule,
    TransactionPublisherModule,
    TxnNotifierModule,
  ],
  providers: [ProviderWebhookService, NonceService],
  exports: [EventEmitterModule, NestConfigModule],
})
export class WorkerModule {}
