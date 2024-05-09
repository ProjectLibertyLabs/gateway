/*
https://docs.nestjs.com/modules
*/

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@songkeys/nestjs-redis';
import { BatchAnnouncementService } from './batch.announcer.service';
import { ConfigModule } from '../../../../libs/common/src/config/config.module';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { BatchAnnouncer } from './batch.announcer';
import { BATCH_QUEUE_NAME, PUBLISH_QUEUE_NAME } from '../../../../libs/common/src';
import { BlockchainModule } from '../../../../libs/common/src/blockchain/blockchain.module';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';

@Module({
  imports: [
    ConfigModule,
    BlockchainModule,
    EventEmitterModule,
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
    BullModule.registerQueue(
      {
        name: PUBLISH_QUEUE_NAME,
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
        name: BATCH_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 1,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    ),
  ],
  controllers: [],
  providers: [BatchAnnouncementService, BatchAnnouncer, IpfsService],
  exports: [BullModule, BatchAnnouncementService, BatchAnnouncer, IpfsService],
})
export class BatchAnnouncerModule {}
