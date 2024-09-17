import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '#graph-lib/config/config.service';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: configService.redisConnectionOptions,
        prefix: `${configService.cacheKeyPrefix}:bull`,
      }),
      inject: [ConfigService],
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
