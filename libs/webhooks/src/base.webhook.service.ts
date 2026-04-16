import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { IWebhookConfig } from './interfaces/webhook-config.interface';
import {
  getHealthz,
  postWebhooksTransactionNotify,
  TxWebhookRsp,
  type Options as WebhookClientOptions,
} from '#types/tx-notification-webhook';
import httpConfig, { IHttpCommonConfig } from '#config/http-common.config';
import { createClient, type Client } from '#types/tx-notification-webhook/client';
import { WEBHOOK_CONFIG } from '#webhooks-lib/webhook.tokens';


/**
 * Base class for posting to a webhook that is configured in the
 * service's environment file.
 */
@Injectable()
export class BaseWebhookService implements OnModuleDestroy {
  protected failedHealthChecks = 0;
  protected successfulHealthChecks = 0;
  private readonly webhookClient: Client;

  private get baseUrl(): string {
    return this.webhookConfig.webhookBaseUrl.toString().replace(/\/+$/, '');
  }

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private eventEmitter: EventEmitter2,
    @Inject(WEBHOOK_CONFIG) private readonly webhookConfig: IWebhookConfig,
    @Inject(httpConfig.KEY) private readonly httpConfig: IHttpCommonConfig,
    private readonly logger: PinoLogger,
    private healthCheckTimeoutName: string = 'webhook.health_check',
  ) {
    this.webhookClient = createClient({
      baseURL: this.baseUrl,
      timeout: this.httpConfig.httpResponseTimeoutMS,
      headers: this.webhookConfig.providerApiToken ? { Authorization: this.webhookConfig.providerApiToken } : undefined,
    });
    this.webhookClient.instance.interceptors.request.use(this.logRequests(logger));
  }

  public onModuleDestroy() {
    try {
      if (this.schedulerRegistry.doesExist('timeout', this.healthCheckTimeoutName)) {
        this.schedulerRegistry.deleteTimeout(this.healthCheckTimeoutName);
      }
    } catch (e) {
      this.logger.debug(`Caught error deleting timeouts: ${e}`);
    }
  }

  // Debug log the actual URL we are attempting to access.
  // Because the URL is generated with HeyApi + OpenAPI spec, rather than duplicating the string
  // for the url, use the interceptor.
  // Pass this logging function to `webhookClient.instance.interceptors.request.use`
  protected logRequests = (logger: PinoLogger) => {
    return (config) => {
      logger.debug(
        {
          method: config.method,
          url: config.url,
        },
        'provider webhook request',
      );
      return config;
    };
  };

  private get requestOptions(): Pick<WebhookClientOptions, 'baseURL' | 'timeout' | 'throwOnError' | 'headers'> {
    return {
      baseURL: this.baseUrl,
      timeout: this.httpConfig.httpResponseTimeoutMS,
      throwOnError: true,
      headers: this.webhookConfig.providerApiToken ? { Authorization: this.webhookConfig.providerApiToken } : undefined,
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

  public async checkHealth() {
    // Check webhook
    try {
      // eslint-disable-next-line no-await-in-loop
      await this.getHealthz();
      this.eventEmitter.emit('webhook.healthy');
      this.successfulHealthChecks += 1;
      this.failedHealthChecks = 0;
    } catch (e) {
      // Reset healthCheckSuccesses to 0 on failure. We will not go out of waiting for
      // recovery until there are a number of sequential healthy responses
      // equaling healthCheckSuccessesThreshold.
      this.successfulHealthChecks = 0;
      this.failedHealthChecks += 1;
    }

    if (this.failedHealthChecks > 0) {
      this.eventEmitter.emit('webhook.unhealthy');
      if (this.failedHealthChecks >= this.webhookConfig.healthCheckMaxRetries) {
        this.logger.error(
          `FATAL ERROR: Failed to connect to provider webhook at '${this.webhookConfig.webhookBaseUrl}' after ${this.failedHealthChecks} attempts.`,
        );
        this.eventEmitter.emit('shutdown');
        return;
      }
      this.logger.warn(`Provider webhook failed health check ${this.failedHealthChecks} times`);
      this.schedulerRegistry.deleteTimeout(this.healthCheckTimeoutName);
      this.schedulerRegistry.addTimeout(
        this.healthCheckTimeoutName,
        setTimeout(
          () => this.checkHealth(),
          Math.min(
            2 ** (this.failedHealthChecks - 1) * MILLISECONDS_PER_SECOND,
            this.webhookConfig.healthCheckMaxRetryIntervalSeconds * MILLISECONDS_PER_SECOND,
          ),
        ),
      );
    } else if (this.successfulHealthChecks > 0) {
      if (this.successfulHealthChecks >= this.webhookConfig.healthCheckSuccessThreshold) {
        this.logger.info(`Provider webhook responded to ${this.successfulHealthChecks} health checks; resuming queue`);
        this.eventEmitter.emit('webhook.healthy');
      } else {
        this.logger.debug(`Provider webhook responded to health check (attempts: ${this.successfulHealthChecks})`);
        this.schedulerRegistry.deleteTimeout(this.healthCheckTimeoutName);
        this.schedulerRegistry.addTimeout(
          this.healthCheckTimeoutName,
          setTimeout(() => this.checkHealth(), this.webhookConfig.webhookRetryIntervalSeconds),
        );
      }
    }
  }
}
