import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import accountWorkerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';

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
    @Inject(accountWorkerConfig.KEY) private config: IAccountWorkerConfig,
    @Inject(httpCommonConfig.KEY) httpConfig: IHttpCommonConfig,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.webhook = axios.create({
      baseURL: this.config.webhookBaseUrl.toString(),
      timeout: httpConfig.httpResponseTimeoutMS,
    });

    // Add request interceptor for logging
    this.webhook.interceptors.request.use(
      (config) => {
        this.logger.debug(`[Provider] Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
        this.logger.debug('[Provider] Request config:', {
          method: config.method,
          url: config.url,
          timeout: config.timeout,
          headers: config.headers,
          data: config.data
        });
        return config;
      },
      (error) => {
        this.logger.error('[Provider] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.webhook.interceptors.response.use(
      (response) => {
        this.logger.debug(`[Provider] Response received for ${response.config.method?.toUpperCase()} ${response.config.url}`);
        this.logger.debug('[Provider] Response details:', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data
        });
        return response;
      },
      (error) => {
        if (axios.isAxiosError(error)) {
          this.logger.error('[Provider] Response interceptor error:');
          this.logger.error(`- Message: ${error.message}`);
          this.logger.error(`- Code: ${error.code}`);
          this.logger.error(`- Status: ${error.response?.status}`);
          this.logger.error(`- Status Text: ${error.response?.statusText}`);
          this.logger.error('- Request Config:', {
            method: error.config?.method,
            url: error.config?.url,
            timeout: error.config?.timeout,
            headers: error.config?.headers
          });
          if (error.response?.data) {
            this.logger.error('- Response Data:', error.response.data);
          }
        } else {
          this.logger.error('[Provider] Non-Axios Error:', error);
        }
        return Promise.reject(error);
      }
    );

    this.webhook.defaults.headers.common.Authorization = this.config.providerApiToken;
  }

  public get providerApi(): AxiosInstance {
    return this.webhook;
  }

  private async checkProviderWebhook() {
    // Check webhook
    try {
      this.logger.debug(`[Provider] Making health check GET request to: ${this.config.webhookBaseUrl}/health`);
      this.logger.debug(`[Provider] Timeout setting: ${this.webhook.defaults.timeout}ms`);
      
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await this.webhook.get(`/health`);
        this.logger.debug(`[Provider] Health check successful`);
        this.logger.debug(`[Provider] Response status: ${response.status}`);
      } catch (error) {
        this.logger.error(`[Provider] Health check failed`);
        if (axios.isAxiosError(error)) {
          this.logger.error('[Provider] Axios Error Details:');
          this.logger.error(`- Message: ${error.message}`);
          this.logger.error(`- Code: ${error.code}`);
          this.logger.error(`- Status: ${error.response?.status}`);
          this.logger.error(`- Status Text: ${error.response?.statusText}`);
          this.logger.error('- Request Config:', {
            method: error.config?.method,
            url: error.config?.url,
            timeout: error.config?.timeout,
            headers: error.config?.headers
          });
          if (error.response?.data) {
            this.logger.error('- Response Data:', error.response.data);
          }
        } else {
          this.logger.error('[Provider] Non-Axios Error:', error);
        }
        throw error;
      }
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
        this.logger.log(`Provider webhook responded to ${this.successfulHealthChecks} health checks; resuming queue`);
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
