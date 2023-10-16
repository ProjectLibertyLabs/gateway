/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '../config/config.module';
import { ScannerService } from './scanner.service';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { ConfigService } from '../config/config.service';
import { QueueConstants } from '../utils/queues';
import { BlockchainService } from '../blockchain/blockchain.service';

@Module({
  imports: [
    ConfigModule,
    BlockchainModule,
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
      name: QueueConstants.IPFS_QUEUE,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [ConfigService, BlockchainService, ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
