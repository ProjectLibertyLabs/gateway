import '@frequency-chain/api-augment';

import { Module } from '@nestjs/common';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { TransactionPublisherService } from './publisher.service';

@Module({
  imports: [BlockchainModule],
  providers: [TransactionPublisherService],
  exports: [TransactionPublisherService],
})
export class TransactionPublisherModule {}
