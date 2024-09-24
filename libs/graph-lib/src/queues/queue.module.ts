import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';
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
        name: QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
        },
      },
      {
        name: QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 1,
        },
      },
      {
        name: QueueConstants.RECONNECT_REQUEST_QUEUE,
        defaultJobOptions: {
          removeOnComplete: false,
          removeOnFail: false,
          attempts: 3,
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
