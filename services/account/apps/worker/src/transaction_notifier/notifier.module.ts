import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BlockchainModule } from '#lib/blockchain/blockchain.module';
import { QueueConstants } from '#lib/utils/queues';
import { ConfigModule } from '#lib/config/config.module';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { TxnNotifierService } from './notifier.service';

@Module({
  imports: [
    BlockchainModule,
    ConfigModule,
    BullModule.registerQueue({
      name: QueueConstants.TRANSACTION_PUBLISH_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: false,
        attempts: 3,
      },
    }),
  ],
  providers: [EnqueueService, TxnNotifierService],
  exports: [EnqueueService, TxnNotifierService],
})
export class TxnNotifierModule {}
