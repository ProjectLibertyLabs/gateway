import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import accountWorkerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';
import { PinoLogger } from 'nestjs-pino';
import {
  type getHealthzData,
  getHealthz,
  type postWebhooksTransactionNotifyData,
  postWebhooksTransactionNotify,
  TxWebhookRsp,
  type Options as WebhookClientOptions,
} from '#types/account-webhook';
import { BaseWebhookService } from '../../../webhooks/src/base.webhook.service';

// these are generated via HeyApi from openapi specs
import { createClient, type Client } from '#types/account-webhook/client';

@Injectable()
export class ProviderWebhookService extends BaseWebhookService<TxWebhookRsp> {
  private readonly webhookClient: Client;

  private get baseUrl(): string {
    return this.config.webhookBaseUrl.toString().replace(/\/+$/, '');
  }

  constructor(
    @Inject(accountWorkerConfig.KEY) private config: IAccountWorkerConfig,
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
      headers: this.config.providerApiToken
        ? { Authorization: this.config.providerApiToken }
        : undefined,
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
