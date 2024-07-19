/*
https://docs.nestjs.com/modules
*/

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RedisModule } from '@songkeys/nestjs-redis';
import { ConfigModule } from '../../../../libs/common/src/config/config.module';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import * as QueueConstants from '../../../../libs/common/src';
import { RequestProcessorService } from './request.processor.service';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';

@Module({
  imports: [
    ConfigModule,
    RedisModule.forRootAsync(
      {
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          config: [{ url: configService.redisUrl.toString() }],
        }),
        inject: [ConfigService],
      },
      true, // isGlobal
    ),
    BullModule.forRootAsync({
      imports: [ConfigModule],
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
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QueueConstants.ASSET_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.REQUEST_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.BROADCAST_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.REPLY_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.REACTION_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.TOMBSTONE_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.UPDATE_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: QueueConstants.PROFILE_QUEUE_NAME,
    }),
  ],
  providers: [RequestProcessorService, IpfsService, DsnpAnnouncementProcessor],
  exports: [BullModule, RequestProcessorService, IpfsService, DsnpAnnouncementProcessor],
})
export class RequestProcessorModule {}
