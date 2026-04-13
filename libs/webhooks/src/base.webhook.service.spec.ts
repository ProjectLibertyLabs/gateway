import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { BaseWebhookService } from './base.webhook.service';
import { IWebhookConfig } from './interfaces/webhook-config.interface';
import { string } from 'joi';

describe('BaseWebhookService', () => {
  const mockEmitter = {
    emit: jest.fn(),
  };
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  const mockRegistry = {
    addTimeout: jest.fn(),
    deleteTimeout: jest.fn(),
    doesExist: jest.fn().mockReturnValue(true),
  };
  const mockConfig: IWebhookConfig = {
    healthCheckMaxRetries: 2,
    healthCheckMaxRetryIntervalSeconds: 1,
    healthCheckSuccessThreshold: 3,
    providerApiToken: 'token',
    webhookBaseUrl: new URL('http://localhost:3030'),
    webhookRetryIntervalSeconds: 4,
  };

  class MyWebhookService extends BaseWebhookService<string> {
    public notifications: string[] = [];
    private _failHealthz: boolean = false;

    // simulates a webhook going away after some successes
    protected getHealthz(): void {
      // eslint-disable-next-line no-underscore-dangle
      if (this._failHealthz) {
        throw new Error('unhealthy');
      }
      this.notifications.push('getHealthz');
    }

    protected async notify(payload: string): Promise<void> {
      this.notifications.push(payload);
    }

    public async checkHealthTest(): Promise<void> {
      this.checkHealth();
    }

    public set failHealthz(fail: boolean) {
      // eslint-disable-next-line no-underscore-dangle
      this._failHealthz = fail;
    }
  }
  const expectHealthCheckFailedBehavior = (expectedFailures: number) => {
    expect(mockEmitter.emit).toHaveBeenCalledWith('webhook.unhealthy');
    expect(mockLogger.warn).toHaveBeenCalledWith(`Provider webhook failed health check ${expectedFailures} times`);
    expect(mockRegistry.deleteTimeout).toHaveBeenCalled();
    expect(mockRegistry.addTimeout).toHaveBeenCalled();
  };
  const expectShutdown = () => {
    expect(mockLogger.error).toHaveBeenCalledWith(
      `FATAL ERROR: Failed to connect to provider webhook at '${mockConfig.webhookBaseUrl}' after ${mockConfig.healthCheckMaxRetries} attempts.`,
    );
    expect(mockEmitter.emit).toHaveBeenCalledWith('shutdown');
  };
  const expectWebhookQueueToResume = () => {
    expect(mockEmitter.emit).toHaveBeenCalledWith('webhook.healthy');
    expect(mockLogger.info).toHaveBeenCalledWith('Provider webhook responded to 3 health checks; resuming queue');
  };
  const expectHealthCheckProbationaryPeriod = (expectedAttempts: number) => {
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Provider webhook responded to health check (attempts: ${expectedAttempts})`,
    );
    expect(mockRegistry.deleteTimeout).toHaveBeenCalled();
    expect(mockRegistry.addTimeout).toHaveBeenCalled();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createWebhookService = () => {
    return new MyWebhookService(
      mockRegistry as unknown as SchedulerRegistry,
      mockEmitter as unknown as EventEmitter2,
      mockConfig,
      mockLogger as unknown as PinoLogger,
      'check-health-check',
    );
  };

  it('check_health success', async () => {
    const svc = createWebhookService();
    await svc.checkHealthTest();
    svc.onModuleDestroy();
    expect(svc.notifications[0]).toEqual('getHealthz');
    expect(mockEmitter.emit).toHaveBeenCalledWith('webhook.healthy');
  });

  it('When getHealthz fails less than max retries it enters probationary period', async () => {
    const svc = createWebhookService();
    svc.failHealthz = true;
    await svc.checkHealthTest();
    svc.onModuleDestroy();
    expectHealthCheckFailedBehavior(1);
  });

  it('when getHealthz fails more than max retries, it shuts down', async () => {
    const svc = createWebhookService();
    svc.failHealthz = true;
    await svc.checkHealthTest();
    await svc.checkHealthTest();
    svc.onModuleDestroy();
    expectShutdown();
  });
  it('when getHealthz fails and then reconnects, it eventually recovers', async () => {
    const svc = createWebhookService();
    svc.failHealthz = true;
    await svc.checkHealthTest();
    svc.failHealthz = false;
    await svc.checkHealthTest();
    expectHealthCheckProbationaryPeriod(1);
    await svc.checkHealthTest();
    expectHealthCheckProbationaryPeriod(2);
    await svc.checkHealthTest();
    svc.onModuleDestroy();
    expectWebhookQueueToResume();
  });
});
