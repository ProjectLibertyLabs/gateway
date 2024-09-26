/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import workerConfig, { IGraphWorkerConfig } from './worker.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService } = configSetup<IGraphWorkerConfig>(workerConfig);

describe('Graph Worker Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    GRAPH_ENVIRONMENT_TYPE: undefined,
    HEALTH_CHECK_MAX_RETRIES: undefined,
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_SUCCESS_THRESHOLD: undefined,
    PROVIDER_ACCESS_TOKEN: undefined,
    PROVIDER_BASE_URL: undefined,
    RECONNECTION_SERVICE_REQUIRED: undefined,
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('should fail if no provider base URL when reconnection service required', async () => {
      const { PROVIDER_BASE_URL: _dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env, RECONNECTION_SERVICE_REQUIRED: 'true' })).rejects.toBeDefined();
    });

    it('should not fail if no provider base URL when reconnection service not required', async () => {
      const { PROVIDER_BASE_URL: _dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env, RECONNECTION_SERVICE_REQUIRED: 'false' })).resolves.toBeDefined();
    });
  });

  describe('valid environment', () => {
    let graphWorkerConfig: IGraphWorkerConfig;
    beforeAll(async () => {
      graphWorkerConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(graphWorkerConfig).toBeDefined();
    });

    it('should get health check max retries', () => {
      expect(graphWorkerConfig.healthCheckMaxRetries).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRIES as string, 10),
      );
    });

    it('should get health check max retry interval seconds', () => {
      expect(graphWorkerConfig.healthCheckMaxRetryIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get health check success threshold', () => {
      expect(graphWorkerConfig.healthCheckSuccessThreshold).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_SUCCESS_THRESHOLD as string, 10),
      );
    });

    it('should get provider api token', () => {
      expect(graphWorkerConfig.providerApiToken).toStrictEqual(ALL_ENV.PROVIDER_ACCESS_TOKEN);
    });

    it('should get provider base URL', () => {
      expect(graphWorkerConfig.providerBaseUrl).toStrictEqual(ALL_ENV.PROVIDER_BASE_URL);
    });

    it('should get reconnection service required', () => {
      expect(graphWorkerConfig.reconnectionServiceRequired).toStrictEqual(
        ALL_ENV.RECONNECTION_SERVICE_REQUIRED === 'true' || ALL_ENV.RECONNECTION_SERVICE_REQUIRED === '1',
      );
    });

    it('should get webhook failure threshold', () => {
      expect(graphWorkerConfig.webhookFailureThreshold).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_FAILURE_THRESHOLD as string, 10),
      );
    });

    it('should get webhook retry interval seconds', () => {
      expect(graphWorkerConfig.webhookRetryIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });
  });
});
