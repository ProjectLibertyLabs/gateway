import { Module } from '@nestjs/common';
import { BlockchainModule } from '#lib/blockchain/blockchain.module';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { TxnNotifierService } from './notifier.service';

@Module({
  imports: [BlockchainModule],
  providers: [EnqueueService, TxnNotifierService],
  exports: [EnqueueService, TxnNotifierService],
})
export class TxnNotifierModule {}
