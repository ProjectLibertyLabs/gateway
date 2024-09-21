import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { ConfigModule } from '@nestjs/config';
import queueConfig, { IQueueConfig } from './queue.config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (queueConf: IQueueConfig) => ({
        connection: queueConf.redisConnectionOptions,
        prefix: queueConf.cacheKeyPrefix,
      }),
      inject: [queueConfig.KEY],
    }),
    BullModule.registerQueue({
      name: QueueConstants.TRANSACTION_PUBLISH_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: false,
        attempts: 1,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
