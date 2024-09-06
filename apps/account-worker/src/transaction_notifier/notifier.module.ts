import { Module } from '@nestjs/common';
import { BlockchainModule } from '#account-lib/blockchain/blockchain.module';
import { TxnNotifierService } from './notifier.service';

@Module({
  imports: [BlockchainModule],
  providers: [TxnNotifierService],
  exports: [],
})
export class TxnNotifierModule {}
