import '@frequency-chain/api-augment';

import { Module } from '@nestjs/common';
import { TransactionPublisherService } from './publisher.service';

@Module({
  imports: [],
  providers: [TransactionPublisherService],
  exports: [],
})
export class TransactionPublisherModule {}
