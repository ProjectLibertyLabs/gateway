import { OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { IWebhookConfig } from './interfaces/webhook-config.interface';
import type { Options as WebhookClientOptions } from '#types/account-webhook';

export abstract class BaseWebhookService<TPayload> implements OnModuleDestroy {
  protected failedHealthChecks = 0;
  protected successfulHealthChecks = 0;

  protected abstract getHealthz(): void;
  protected abstract notify(payload: TPayload): Promise<void>;

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private eventEmitter: EventEmitter2,
    private readonly webhookConfig: IWebhookConfig,
    private readonly logger: PinoLogger,
    private healthCheckTimeoutName: string = 'webhook.health_check',
  ) {}

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
  // for the url, pass this logging function to `webhookClient.instance.interceptors.request.use`
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

  protected async checkHealth() {
    // Check webhook
    try {
      // eslint-disable-next-line no-await-in-loop
      await this.getHealthz();
      this.eventEmitter.emit('webhook.healthy');
      this.successfulHealthChecks += 1;
      this.failedHealthChecks = 0;
    } catch (e) {
      // Reset healthCheckSuccesses to 0 on failure. We will not go out of waiting for recovery until there
      // are a number of sequential healthy responses equaling healthCheckSuccessesThreshold.
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
