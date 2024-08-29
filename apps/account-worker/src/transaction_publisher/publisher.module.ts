import '@frequency-chain/api-augment';

import { Module } from '@nestjs/common';
import { BlockchainModule } from '#account-lib/blockchain/blockchain.module';
import { NonceService } from '#account-lib/services/nonce.service';
import { TransactionPublisherService } from './publisher.service';

@Module({
  imports: [BlockchainModule],
  providers: [TransactionPublisherService, NonceService],
  exports: [TransactionPublisherService],
})
export class TransactionPublisherModule {}
