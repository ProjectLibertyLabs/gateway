import { ConfigService } from '#libs/config/config.service';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import * as QueueConstants from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        // Note: BullMQ doesn't honor a URL for the Redis connection, and
        // JS URL doesn't parse 'redis://' as a valid protocol, so we fool
        // it by changing the URL to use 'http://' in order to parse out
        // the host, port, username, password, etc.
        // We could pass REDIS_HOST, REDIS_PORT, etc, in the environment, but
        // trying to keep the # of environment variables from proliferating
        const url = new URL(configService.redisUrl.toString().replace(/^redis[s]*/, 'http'));
        const { hostname, port, username, password, pathname } = url;
        return {
          connection: {
            host: hostname || undefined,
            port: port ? Number(port) : undefined,
            username: username || undefined,
            password: password || undefined,
            db: pathname?.length > 1 ? Number(pathname.slice(1)) : undefined,
          },
          prefix: `${configService.cacheKeyPrefix}:bull`,
        };
      },
      inject: [ConfigService],
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
        name: QueueConstants.TRANSACTION_RECEIPT_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: false,
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
