import { Module } from '@nestjs/common';
import { TxnNotifierService } from './notifier.service';
import { BaseWebhookService } from '../../../../libs/webhooks/src/base.webhook.service';

@Module({
  imports: [],
  providers: [BaseWebhookService, TxnNotifierService],
  exports: [],
})
export class TxnNotifierModule {}
