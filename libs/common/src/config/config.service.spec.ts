/* eslint-disable import/no-extraneous-dependencies */
/*
https://docs.nestjs.com/fundamentals/testing#unit-testing
*/

import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { configModuleOptions } from './env.config';

const setupConfigService = async (envObj: any): Promise<ConfigService> => {
  jest.resetModules();
  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  process.env = {
    ...envObj,
  };
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ...configModuleOptions,
        ignoreEnvFile: true,
        load: [() => process.env],
      }),
    ],
    controllers: [],
    providers: [ConfigService],
  }).compile();

  await ConfigModule.envVariablesLoaded;

  return moduleRef.get<ConfigService>(ConfigService);
};

describe('GraphSericeConfig', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    REDIS_URL: undefined,
    FREQUENCY_URL: undefined,
    QUEUE_HIGH_WATER: undefined,
    API_PORT: undefined,
    RECONNECTION_SERVICE_REQUIRED: undefined,
    BLOCKCHAIN_SCAN_INTERVAL_MINUTES: undefined,
    GRAPH_ENVIRONMENT_TYPE: undefined,
    GRAPH_ENVIRONMENT_DEV_CONFIG: undefined,
    PROVIDER_ACCOUNT_SEED_PHRASE: undefined,
    PROVIDER_ID: undefined,
    PROVIDER_BASE_URL: undefined,
    PROVIDER_ACCESS_TOKEN: undefined,
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    HEALTH_CHECK_SUCCESS_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRIES: undefined,
    PAGE_SIZE: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('missing redis url should fail', async () => {
      const { REDIS_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).rejects.toBeDefined();
    });

    it('invalid redis url should fail', async () => {
      const { REDIS_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ REDIS_URL: 'invalid url', ...env })).rejects.toBeDefined();
    });

    it('missing frequency url should fail', async () => {
      const { FREQUENCY_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).rejects.toBeDefined();
    });

    it('invalid frequency url should fail', async () => {
      const { FREQUENCY_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ FREQUENCY_URL: 'invalid url', ...env })).rejects.toBeDefined();
    });

    it('invalid api port should fail', async () => {
      const { API_PORT: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ API_PORT: -1, ...env })).rejects.toBeDefined();
    });

    it('missing graph environment dev config should fail', async () => {
      const { GRAPH_ENVIRONMENT_TYPE: dummy, GRAPH_ENVIRONMENT_DEV_CONFIG: dummy2, ...env } = ALL_ENV;
      await expect(setupConfigService({ GRAPH_ENVIRONMENT_TYPE: 'Dev', GRAPH_ENVIRONMENT_DEV_CONFIG: undefined, ...env })).rejects.toBeDefined();
    });

    it('invalid graph environment dev config should fail', async () => {
      const { GRAPH_ENVIRONMENT_TYPE: dummy, GRAPH_ENVIRONMENT_DEV_CONFIG: dummy2, ...env } = ALL_ENV;
      await expect(setupConfigService({ GRAPH_ENVIRONMENT_TYPE: 'Dev', GRAPH_ENVIRONMENT_DEV_CONFIG: 'invalid json', ...env })).rejects.toBeDefined();
    });
  });

  describe('valid environment', () => {
    let graphServiceConfig: ConfigService;
    beforeAll(async () => {
      graphServiceConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(graphServiceConfig).toBeDefined();
    });

    it('should get redis url', () => {
      expect(graphServiceConfig.redisUrl?.toString()).toStrictEqual(ALL_ENV.REDIS_URL?.toString());
    });

    it('should get frequency url', () => {
      expect(graphServiceConfig.frequencyUrl?.toString()).toStrictEqual(ALL_ENV.FREQUENCY_URL?.toString());
    });

    it('should get queue high water mark', () => {
      expect(graphServiceConfig.getQueueHighWater()).toStrictEqual(parseInt(ALL_ENV.QUEUE_HIGH_WATER as string, 10));
    });

    it('should get api port', () => {
      expect(graphServiceConfig.getApiPort()).toStrictEqual(parseInt(ALL_ENV.API_PORT as string, 10));
    });

    it('should get reconnection service required', () => {
      expect(graphServiceConfig.getReconnectionServiceRequired()).toStrictEqual(ALL_ENV.RECONNECTION_SERVICE_REQUIRED === 'true');
    });

    it('should get blockchain scan interval minutes', () => {
      expect(graphServiceConfig.getBlockchainScanIntervalMinutes()).toStrictEqual(parseInt(ALL_ENV.BLOCKCHAIN_SCAN_INTERVAL_MINUTES as string, 10));
    });

    it('should get graph environment type', () => {
      expect(graphServiceConfig.getGraphEnvironmentType()).toStrictEqual(ALL_ENV.GRAPH_ENVIRONMENT_TYPE);
    });

    it('should get graph environment dev config', () => {
      expect(graphServiceConfig.getGraphEnvironmentConfig()).toStrictEqual(ALL_ENV.GRAPH_ENVIRONMENT_DEV_CONFIG);
    });

    it('should get provider account seed phrase', () => {
      expect(graphServiceConfig.getProviderAccountSeedPhrase()).toStrictEqual(ALL_ENV.PROVIDER_ACCOUNT_SEED_PHRASE);
    });

    it('should get provider id', () => {
      expect(graphServiceConfig.getProviderId()).toStrictEqual(ALL_ENV.PROVIDER_ID);
    });

    it('should get provider base url', () => {
      expect(graphServiceConfig.providerBaseUrl?.toString()).toStrictEqual(ALL_ENV.PROVIDER_BASE_URL?.toString());
    });

    it('should get provider api token', () => {
      expect(graphServiceConfig.providerApiToken).toStrictEqual(ALL_ENV.PROVIDER_ACCESS_TOKEN);
    });

    it('should get webhook failure threshold', () => {
      expect(graphServiceConfig.getWebhookFailureThreshold()).toStrictEqual(parseInt(ALL_ENV.WEBHOOK_FAILURE_THRESHOLD as string, 10));
    });

    it('should get health check success threshold', () => {
      expect(graphServiceConfig.getHealthCheckSuccessThreshold()).toStrictEqual(parseInt(ALL_ENV.HEALTH_CHECK_SUCCESS_THRESHOLD as string, 10));
    });

    it('should get webhook retry interval seconds', () => {
      expect(graphServiceConfig.getWebhookRetryIntervalSeconds()).toStrictEqual(parseInt(ALL_ENV.WEBHOOK_RETRY_INTERVAL_SECONDS as string, 10));
    });

    it('should get health check max retry interval seconds', () => {
      expect(graphServiceConfig.getHealthCheckMaxRetryIntervalSeconds()).toStrictEqual(parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS as string, 10));
    });

    it('should get health check max retries', () => {
      expect(graphServiceConfig.getHealthCheckMaxRetries()).toStrictEqual(parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRIES as string, 10));
    });

    it('should get page size', () => {
      expect(graphServiceConfig.getPageSize()).toStrictEqual(parseInt(ALL_ENV.PAGE_SIZE as string, 10));
    });
  });
});
