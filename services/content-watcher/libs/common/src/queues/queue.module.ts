import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import * as QueueConstants from './queue-constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: AppConfigService) => {
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
      inject: [AppConfigService],
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
