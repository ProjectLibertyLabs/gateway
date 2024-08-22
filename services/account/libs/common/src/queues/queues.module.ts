import { ConfigModule } from '#lib/config/config.module';
import { ConfigService } from '#lib/config/config.service';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Global, Module } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import * as QueueConstants from './queue.constants';

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
    BullModule.registerQueue({
      name: QueueConstants.TRANSACTION_PUBLISH_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: false,
        attempts: 1,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {
  // static forRoot(redisOptions?: RedisOptions): DynamicModule {
  //   return {
  //     module: QueueModule,
  //     global: true,
  //     imports: [
  //       BullModule.forRootAsync({
  //         imports: [ConfigModule],
  //         useFactory: (configService: ConfigService) => ({
  //           connection: {
  //             ...configService.redisConnectionOptions,
  //             ...redisOptions,
  //           },
  //           prefix: `${configService.cacheKeyPrefix}:bull`,
  //         }),
  //         inject: [ConfigService],
  //       }),
  //     ],
  //     exports: [BullModule],
  //   };
  // }
}
