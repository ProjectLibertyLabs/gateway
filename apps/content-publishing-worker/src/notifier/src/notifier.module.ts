import { Module } from '@nestjs/common';
import accountWorkerConfig from '#content-publishing-worker/worker.config';
import { TxnNotifierService } from './notifier.service';
import { BaseWebhookService } from '#webhooks-lib/base.webhook.service';
import { WEBHOOK_CONFIG } from '#webhooks-lib/webhook.tokens';

@Module({
  imports: [],
  providers: [
    {
      provide: WEBHOOK_CONFIG,
      useExisting: accountWorkerConfig.KEY,
    },
    BaseWebhookService,
    TxnNotifierService,
  ],
  exports: [BaseWebhookService],
})
export class TxnNotifierModule {}
