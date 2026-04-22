import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import contentPublishingConfig from '#content-publishing-worker/worker.config';
import { TxnNotifierService } from './notifier.service';
import { BaseWebhookService } from '#webhooks-lib/base.webhook.service';
import { WEBHOOK_CONFIG } from '#webhooks-lib/webhook.tokens';

@Module({
  imports: [EventEmitterModule, ScheduleModule],
  providers: [
    {
      provide: WEBHOOK_CONFIG,
      useExisting: contentPublishingConfig.KEY,
    },
    BaseWebhookService,
    TxnNotifierService,
  ],
  exports: [BaseWebhookService],
})
export class TxnNotifierModule {}
