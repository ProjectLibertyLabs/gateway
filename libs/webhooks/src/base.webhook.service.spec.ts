import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { BaseWebhookService } from './base.webhook.service';
import { IWebhookConfig } from './interfaces/webhook-config.interface';
import { IHttpCommonConfig } from '#config/http-common.config';

describe('BaseWebhookService', () => {
  let getHealthzMock;

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

  const mockHttpConfig: IHttpCommonConfig = {
    httpResponseTimeoutMS: 10,
  };

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

  async function throwingFunction() {
    throw new Error('Failed');
  }

  beforeEach(() => {
    getHealthzMock = jest.spyOn(BaseWebhookService.prototype, 'getHealthz');
    jest.useFakeTimers();
    jest.clearAllMocks();
    service = new BaseWebhookService(
      mockRegistry as unknown as SchedulerRegistry,
      mockEmitter as unknown as EventEmitter2,
      mockConfig,
      mockHttpConfig,
      mockLogger as unknown as PinoLogger,
    );
  });

  let service: BaseWebhookService;

  afterEach(() => {
    service?.onModuleDestroy();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('check_health success', async () => {
    getHealthzMock.mockImplementationOnce(jest.fn());
    await service.checkHealth();
    expect(mockEmitter.emit).toHaveBeenCalledWith('webhook.healthy');
  });

  it('When getHealthz fails less than max retries it enters probationary period', async () => {
    getHealthzMock.mockImplementationOnce(throwingFunction);
    await service.checkHealth();
    expectHealthCheckFailedBehavior(1);
  });

  it('when getHealthz fails more than max retries, it shuts down', async () => {
    getHealthzMock.mockImplementationOnce(throwingFunction).mockImplementationOnce(throwingFunction);
    await service.checkHealth();
    await service.checkHealth();
    expectShutdown();
  });
  it('when getHealthz fails and then reconnects, it eventually recovers', async () => {
    getHealthzMock
      .mockImplementationOnce(throwingFunction)
      .mockImplementationOnce(jest.fn())
      .mockImplementationOnce(jest.fn())
      .mockImplementationOnce(jest.fn());
    await service.checkHealth();
    await service.checkHealth();
    expectHealthCheckProbationaryPeriod(1);
    await service.checkHealth();
    expectHealthCheckProbationaryPeriod(2);
    await service.checkHealth();
    expectWebhookQueueToResume();
  });
});
