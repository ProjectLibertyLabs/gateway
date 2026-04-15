import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import contentPublishingWorkerConfig, {
  IContentPublishingWorkerConfig,
} from '#content-publishing-worker/worker.config';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';
import { PinoLogger } from 'nestjs-pino';
import {
  getHealthz,
  postWebhooksTransactionNotify,
  TxWebhookRsp,
  type Options as WebhookClientOptions,
} from '#types/account-webhook';
import { BaseWebhookService } from '../../../webhooks/src/base.webhook.service';

// these are generated via HeyApi from openapi specs
import { createClient, type Client } from '#types/content-pubishing-webhook/client';

@Injectable()
export class ProviderWebhookService extends BaseWebhookService<TxWebhookRsp> {
  private readonly webhookClient: Client;

  private get baseUrl(): string {
    return this.config.webhookBaseUrl.toString().replace(/\/+$/, '');
  }

  constructor(
    @Inject(contentPublishingWorkerConfig.KEY) private config: IContentPublishingWorkerConfig,
    @Inject(httpCommonConfig.KEY) private readonly httpConfig: IHttpCommonConfig,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
    logger: PinoLogger,
  ) {
    super(schedulerRegistry, eventEmitter, config, logger);
    logger.setContext(this.constructor.name);
    this.webhookClient = createClient({
      baseURL: this.baseUrl,
      timeout: this.httpConfig.httpResponseTimeoutMS,
      headers: this.config.providerApiToken ? { Authorization: this.config.providerApiToken } : undefined,
    });
    this.webhookClient.instance.interceptors.request.use(this.logRequests(logger));
  }

  private get requestOptions(): Pick<WebhookClientOptions, 'baseURL' | 'timeout' | 'throwOnError' | 'headers'> {
    return {
      baseURL: this.baseUrl,
      timeout: this.httpConfig.httpResponseTimeoutMS,
      throwOnError: true,
      headers: this.config.providerApiToken ? { Authorization: this.config.providerApiToken } : undefined,
    };
  }

  public async getHealthz() {
    await getHealthz({
      ...this.requestOptions,
      client: this.webhookClient,
    });
  }

  public async notify(body: TxWebhookRsp): Promise<void> {
    await postWebhooksTransactionNotify({
      ...this.requestOptions,
      client: this.webhookClient,
      body,
    });
  }
}
