import { ConfigService } from '#lib/config/config.service';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
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
export class QueueModule {}
