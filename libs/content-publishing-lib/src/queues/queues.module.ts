import { ConfigService } from '#content-publishing-lib/config/config.service';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { redisEventsToEventEmitter, redisReadyMap } from '#content-publishing-lib/utils/redis';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService, eventEmitter: EventEmitter2) => {
        // Default map only has 'default' entry; add 'bull' entry
        redisReadyMap.set('bull', false);
        const connection = new Redis(configService.redisUrl.toString(), { maxRetriesPerRequest: null });
        redisEventsToEventEmitter(connection, eventEmitter, 'bull');
        return {
          connection,
          prefix: `${configService.cacheKeyPrefix}:bull`,
        };
      },
      inject: [ConfigService, EventEmitter2],
    }),
    BullModule.registerQueue(
      {
        name: QueueConstants.ASSET_QUEUE_NAME,
      },
      {
        name: QueueConstants.REQUEST_QUEUE_NAME,
      },
      {
        name: QueueConstants.BROADCAST_QUEUE_NAME,
      },
      {
        name: QueueConstants.REPLY_QUEUE_NAME,
      },
      {
        name: QueueConstants.REACTION_QUEUE_NAME,
      },
      {
        name: QueueConstants.TOMBSTONE_QUEUE_NAME,
      },
      {
        name: QueueConstants.UPDATE_QUEUE_NAME,
      },
      {
        name: QueueConstants.PROFILE_QUEUE_NAME,
      },
      {
        name: QueueConstants.BATCH_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 1,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.PUBLISH_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 1,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QueueConstants.STATUS_QUEUE_NAME,
      },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
