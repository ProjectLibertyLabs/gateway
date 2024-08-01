import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { ConfigService } from '../config/config.service';

const HEALTH_CHECK_TIMEOUT_NAME = 'health_check';

@Injectable()
export class ProviderWebhookService implements OnModuleDestroy {
  private logger: Logger;

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
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.webhook = axios.create({
      baseURL: this.configService.providerBaseUrl.toString(),
    });

    this.webhook.defaults.headers.common.Authorization = this.configService.providerApiToken;
  }

  public get providerApi(): AxiosInstance {
    return this.webhook;
  }

  private async checkProviderWebhook() {
    // Check webhook
    try {
      // eslint-disable-next-line no-await-in-loop
      await this.webhook.get(`/health`);
      this.successfulHealthChecks += 1;
      this.failedHealthChecks = 0;
    } catch (e: any) {
      // Reset healthCheckSuccesses to 0 on failure. We will not go out of waiting for recovery until there
      // are a number of sequential healthy responses equaling healthCheckSuccessesThreshold.
      this.successfulHealthChecks = 0;
      this.failedHealthChecks += 1;
    }

    if (this.failedHealthChecks > 0) {
      if (this.failedHealthChecks >= this.configService.getHealthCheckMaxRetries()) {
        this.logger.error(`FATAL ERROR: Failed to connect to provider webhook at '${this.configService.providerBaseUrl}' after ${this.failedHealthChecks} attempts.`);
        this.eventEmitter.emit('shutdown');
        return;
      }
      this.logger.warn(`Provider webhook failed health check ${this.failedHealthChecks} times`);
      this.schedulerRegistry.deleteTimeout(HEALTH_CHECK_TIMEOUT_NAME);
      this.schedulerRegistry.addTimeout(
        HEALTH_CHECK_TIMEOUT_NAME,
        setTimeout(
          () => this.checkProviderWebhook(),
          Math.min(2 ** (this.failedHealthChecks - 1) * MILLISECONDS_PER_SECOND, this.configService.getHealthCheckMaxRetryIntervalSeconds() * MILLISECONDS_PER_SECOND),
        ),
      );
    } else if (this.successfulHealthChecks > 0) {
      if (this.successfulHealthChecks >= this.configService.getHealthCheckSuccessThreshold()) {
        this.logger.log(`Provider webhook responded to ${this.successfulHealthChecks} health checks; resuming queue`);
        this.eventEmitter.emit('webhook.healthy');
      } else {
        this.logger.debug(`Provider webhook responded to health check (attempts: ${this.successfulHealthChecks})`);
        this.schedulerRegistry.deleteTimeout(HEALTH_CHECK_TIMEOUT_NAME);
        this.schedulerRegistry.addTimeout(
          HEALTH_CHECK_TIMEOUT_NAME,
          setTimeout(() => this.checkProviderWebhook(), this.configService.getWebhookRetryIntervalSeconds()),
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
