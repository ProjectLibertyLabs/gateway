import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@songkeys/nestjs-redis';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ApiService } from './api.service';
import { HealthController, ScanControllerV1, SearchControllerV1, WebhookControllerV1 } from './controllers';
import { BlockchainModule } from '@libs/common/blockchain/blockchain.module';
import { CrawlerModule } from '@libs/common/crawler/crawler.module';
import { IPFSProcessorModule } from '@libs/common/ipfs/ipfs.module';
import { PubSubModule } from '@libs/common/pubsub/pubsub.module';
import { ScannerModule } from '@libs/common/scanner/scanner.module';
import { ConfigModule } from '@libs/common/config/config.module'
import { ConfigService } from '@libs/common/config/config.service'
import * as QueueConstants from '@libs/common';

@Module({
  imports: [
    ConfigModule,
    BlockchainModule,
    ScannerModule,
    CrawlerModule,
    IPFSProcessorModule,
    PubSubModule,
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
        name: QueueConstants.PROFILE_QUEUE_NAME,
      },
      {
        name: QueueConstants.UPDATE_QUEUE_NAME,
      },
    ),

    // Bullboard UI
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.REQUEST_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.IPFS_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.BROADCAST_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.REPLY_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.REACTION_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.TOMBSTONE_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.PROFILE_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueConstants.UPDATE_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
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
      maxListeners: 10,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [ApiService],
  controllers: [HealthController, ScanControllerV1, SearchControllerV1, WebhookControllerV1],
  exports: [],
})
export class ApiModule {}
