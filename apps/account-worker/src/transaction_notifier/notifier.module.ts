import { Module } from '@nestjs/common';
import { TxnNotifierService } from './notifier.service';

@Module({
  imports: [],
  providers: [TxnNotifierService],
  exports: [],
})
export class TxnNotifierModule {}
