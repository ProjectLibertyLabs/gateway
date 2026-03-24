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
import { createClient, type Client } from '#types/account-webhook/client';

const HEALTH_CHECK_TIMEOUT_NAME = 'health_check';
const HEALTHZ_PATH: getHealthzData['url'] = '/healthz';
const TRANSACTION_NOTIFY_PATH: postWebhooksTransactionNotifyData['url'] = '/webhooks/transaction-notify';

@Injectable()
export class ProviderWebhookService implements OnModuleDestroy {
  private failedHealthChecks = 0;

  private successfulHealthChecks = 0;

  private readonly webhookClient: Client;

  private get baseUrl(): string {
    return this.config.webhookBaseUrl.toString().replace(/\/+$/, '');
  }

  public onModuleDestroy() {
    try {
      if (this.schedulerRegistry.doesExist('timeout', HEALTH_CHECK_TIMEOUT_NAME)) {
        this.schedulerRegistry.deleteTimeout(HEALTH_CHECK_TIMEOUT_NAME);
      }
    } catch (e) {
      this.logger.debug(`Caught error deleting timeouts: ${e}`);
    }
  }

  constructor(
    @Inject(accountWorkerConfig.KEY) private config: IAccountWorkerConfig,
    @Inject(httpCommonConfig.KEY) private readonly httpConfig: IHttpCommonConfig,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
    this.webhookClient = createClient({
      baseURL: this.baseUrl,
      timeout: this.httpConfig.httpResponseTimeoutMS,
      headers: this.config.providerApiToken ? { Authorization: this.config.providerApiToken } : undefined,
    });
  }

  private get requestOptions(): Pick<WebhookClientOptions, 'baseURL' | 'timeout' | 'throwOnError' | 'headers'> {
    return {
      baseURL: this.baseUrl,
      timeout: this.httpConfig.httpResponseTimeoutMS,
      throwOnError: true,
      headers: this.config.providerApiToken ? { Authorization: this.config.providerApiToken } : undefined,
    };
  }

  public getHealthzUrl(): string {
    return this.webhookClient.buildUrl({ url: HEALTHZ_PATH });
  }

  public getTransactionNotifyUrl(): string {
    return this.webhookClient.buildUrl({ url: TRANSACTION_NOTIFY_PATH });
  }

  public async sendTransactionNotify(body: TxWebhookRsp): Promise<void> {
    await postWebhooksTransactionNotify({
      ...this.requestOptions,
      client: this.webhookClient,
      body,
    });
  }

  private async checkProviderWebhook() {
    // Check webhook
    try {
      // eslint-disable-next-line no-await-in-loop
      await getHealthz({
        ...this.requestOptions,
        client: this.webhookClient,
      });
      this.successfulHealthChecks += 1;
      this.failedHealthChecks = 0;
    } catch (e) {
      // Reset healthCheckSuccesses to 0 on failure. We will not go out of waiting for recovery until there
      // are a number of sequential healthy responses equaling healthCheckSuccessesThreshold.
      this.successfulHealthChecks = 0;
      this.failedHealthChecks += 1;
    }

    if (this.failedHealthChecks > 0) {
      if (this.failedHealthChecks >= this.config.healthCheckMaxRetries) {
        this.logger.error(
          `FATAL ERROR: Failed to connect to provider webhook at '${this.config.webhookBaseUrl}' after ${this.failedHealthChecks} attempts.`,
        );
        this.eventEmitter.emit('shutdown');
        return;
      }
      this.logger.warn(`Provider webhook failed health check ${this.failedHealthChecks} times`);
      this.schedulerRegistry.deleteTimeout(HEALTH_CHECK_TIMEOUT_NAME);
      this.schedulerRegistry.addTimeout(
        HEALTH_CHECK_TIMEOUT_NAME,
        setTimeout(
          () => this.checkProviderWebhook(),
          Math.min(
            2 ** (this.failedHealthChecks - 1) * MILLISECONDS_PER_SECOND,
            this.config.healthCheckMaxRetryIntervalSeconds * MILLISECONDS_PER_SECOND,
          ),
        ),
      );
    } else if (this.successfulHealthChecks > 0) {
      if (this.successfulHealthChecks >= this.config.healthCheckSuccessThreshold) {
        this.logger.info(`Provider webhook responded to ${this.successfulHealthChecks} health checks; resuming queue`);
        this.eventEmitter.emit('webhook.healthy');
      } else {
        this.logger.debug(`Provider webhook responded to health check (attempts: ${this.successfulHealthChecks})`);
        this.schedulerRegistry.deleteTimeout(HEALTH_CHECK_TIMEOUT_NAME);
        this.schedulerRegistry.addTimeout(
          HEALTH_CHECK_TIMEOUT_NAME,
          setTimeout(() => this.checkProviderWebhook(), this.config.webhookRetryIntervalSeconds),
        );
      }
    }
  }

  @OnEvent('webhook.unhealthy')
  private startWebhookHealthCheck() {
    this.logger.debug('Received webhook.gone event; pausing queue and starting provider webhook health check');
    this.failedHealthChecks = 0;
    this.successfulHealthChecks = 0;
    this.schedulerRegistry.addTimeout(
      HEALTH_CHECK_TIMEOUT_NAME,
      setTimeout(() => this.checkProviderWebhook(), 0),
    );
  }
}
