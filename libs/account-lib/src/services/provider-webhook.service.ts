import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import accountWorkerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';
import { PinoLogger } from 'nestjs-pino';

const HEALTH_CHECK_TIMEOUT_NAME = 'health_check';

@Injectable()
export class ProviderWebhookService implements OnModuleDestroy {
  private failedHealthChecks = 0;

  private successfulHealthChecks = 0;

  private webhook: AxiosInstance;

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
    @Inject(httpCommonConfig.KEY) httpConfig: IHttpCommonConfig,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
    this.webhook = axios.create({
      baseURL: this.config.webhookBaseUrl.toString(),
      timeout: httpConfig.httpResponseTimeoutMS,
    });

    this.webhook.defaults.headers.common.Authorization = this.config.providerApiToken;
  }

  public get providerApi(): AxiosInstance {
    return this.webhook;
  }

  private async checkProviderWebhook() {
    // Check webhook
    try {
      await this.webhook.get(`/health`);
      this.successfulHealthChecks += 1;
      this.failedHealthChecks = 0;
    } catch (_e) {
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
