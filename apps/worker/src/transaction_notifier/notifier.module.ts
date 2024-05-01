import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { BlockchainModule } from '#lib/blockchain/blockchain.module';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { QueueConstants } from '#lib/utils/queues';
import { ConfigModule } from '#lib/config/config.module';
import { ConfigService } from '#lib/config/config.service';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { TxnNotifierService } from './notifier.service';

@Module({
  imports: [
    BlockchainModule,
    ConfigModule,
    BullModule.registerQueue(
      {
        name: QueueConstants.TRANSACTION_PUBLISH_QUEUE,
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: false,
          attempts: 3,
        },
      },
      {
        name: QueueConstants.TRANSACTION_NOTIFY_QUEUE,
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: false,
          attempts: 3,
        },
      },
    ),
  ],
  providers: [TxnNotifierService, BlockchainService, EnqueueService, ConfigService],
  exports: [TxnNotifierService, BlockchainService, EnqueueService, ConfigService],
})
export class TxnNotifierModule {}
