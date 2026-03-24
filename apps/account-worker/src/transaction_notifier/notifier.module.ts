import { Module } from '@nestjs/common';
import { TxnNotifierService } from './notifier.service';
import { ProviderWebhookService } from '#account-lib/services/provider-webhook.service';

@Module({
  imports: [],
  providers: [ProviderWebhookService, TxnNotifierService],
  exports: [],
})
export class TxnNotifierModule {}
