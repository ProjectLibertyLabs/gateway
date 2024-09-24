import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ContentWatcherQueues as QueueConstants } from '#types/constants/queue.constants';
import queueConfig, { IQueueConfig } from './queue.config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (queueConf: IQueueConfig) => ({
        connection: queueConf.redisConnectionOptions,
        prefix: `${queueConf.cacheKeyPrefix}:bull`,
      }),
      inject: [queueConfig.KEY],
    }),
    BullModule.registerQueue(
      {
        name: QueueConstants.REQUEST_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.IPFS_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.BROADCAST_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.REPLY_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.REACTION_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.TOMBSTONE_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.PROFILE_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.UPDATE_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
