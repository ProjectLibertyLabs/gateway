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

describe('AccountSericeConfig', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    REDIS_URL: undefined,
    FREQUENCY_URL: undefined,
    QUEUE_HIGH_WATER: undefined,
    API_PORT: undefined,
    DEBOUNCE_SECONDS: undefined,
    RECONNECTION_SERVICE_REQUIRED: undefined,
    BLOCKCHAIN_SCAN_INTERVAL_MINUTES: undefined,
    ACCOUNT_ENVIRONMENT_TYPE: undefined,
    ACCOUNT_ENVIRONMENT_DEV_CONFIG: undefined,
    PROVIDER_ACCOUNT_SEED_PHRASE: undefined,
    PROVIDER_ID: undefined,
    SIWF_URL: undefined,
    SIWF_DOMAIN: undefined,
    PROVIDER_BASE_URL: undefined,
    PROVIDER_ACCESS_TOKEN: undefined,
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    HEALTH_CHECK_SUCCESS_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRIES: undefined,
    PAGE_SIZE: undefined,
    CAPACITY_LIMIT: undefined,
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
      const { ACCOUNT_ENVIRONMENT_TYPE: dummy, ACCOUNT_ENVIRONMENT_DEV_CONFIG: dummy2, ...env } = ALL_ENV;
      await expect(
        setupConfigService({
          ACCOUNT_ENVIRONMENT_TYPE: 'Dev',
          ACCOUNT_ENVIRONMENT_DEV_CONFIG: undefined,
          ...env,
        }),
      ).rejects.toBeDefined();
    });

    it('invalid graph environment dev config should fail', async () => {
      const { ACCOUNT_ENVIRONMENT_TYPE: dummy, ACCOUNT_ENVIRONMENT_DEV_CONFIG: dummy2, ...env } = ALL_ENV;
      await expect(
        setupConfigService({
          ACCOUNT_ENVIRONMENT_TYPE: 'Dev',
          ACCOUNT_ENVIRONMENT_DEV_CONFIG: 'invalid json',
          ...env,
        }),
      ).rejects.toBeDefined();
    });

    it('missing capacity limits should fail', async () => {
      const { CAPACITY_LIMIT: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ CAPACITY_LIMIT: undefined, ...env })).rejects.toBeDefined();
    });

    it('invalid capacity limit should fail', async () => {
      const { CAPACITY_LIMIT: dummy, ...env } = ALL_ENV;
      await expect(
        setupConfigService({ CAPACITY_LIMIT: '{ "type": "bad type", "value": 0 }', ...env }),
      ).rejects.toBeDefined();
      await expect(async () =>
        setupConfigService({ CAPACITY_LIMIT: '{ "type": "percentage", "value": -1 }', ...env }),
      ).rejects.toBeDefined();
      await expect(
        setupConfigService({ CAPACITY_LIMIT: '{ "type": "percentage", "value": 101 }', ...env }),
      ).rejects.toBeDefined();
      await expect(
        setupConfigService({ CAPACITY_LIMIT: '{ "type": "amount", "value": -1 }', ...env }),
      ).rejects.toBeDefined();
    });
  });

  describe('valid environment', () => {
    let accountServiceConfig: ConfigService;
    beforeAll(async () => {
      accountServiceConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(accountServiceConfig).toBeDefined();
    });

    it('should get redis url', () => {
      expect(accountServiceConfig.redisUrl?.toString()).toStrictEqual(ALL_ENV.REDIS_URL?.toString());
    });

    it('should get frequency url', () => {
      expect(accountServiceConfig.frequencyUrl?.toString()).toStrictEqual(ALL_ENV.FREQUENCY_URL?.toString());
    });

    it('should get queue high water mark', () => {
      expect(accountServiceConfig.getQueueHighWater()).toStrictEqual(parseInt(ALL_ENV.QUEUE_HIGH_WATER as string, 10));
    });

    it('should get api port', () => {
      expect(accountServiceConfig.getApiPort()).toStrictEqual(parseInt(ALL_ENV.API_PORT as string, 10));
    });

    it('should get reconnection service required', () => {
      expect(accountServiceConfig.getReconnectionServiceRequired()).toStrictEqual(
        ALL_ENV.RECONNECTION_SERVICE_REQUIRED === 'true',
      );
    });

    it('should get blockchain scan interval minutes', () => {
      expect(accountServiceConfig.getBlockchainScanIntervalMinutes()).toStrictEqual(
        parseInt(ALL_ENV.BLOCKCHAIN_SCAN_INTERVAL_MINUTES as string, 10),
      );
    });

    it('should get graph environment type', () => {
      expect(accountServiceConfig.getAccountEnvironmentType()).toStrictEqual(ALL_ENV.ACCOUNT_ENVIRONMENT_TYPE);
    });

    it('should get graph environment dev config', () => {
      expect(accountServiceConfig.getAccountEnvironmentConfig()).toStrictEqual(ALL_ENV.ACCOUNT_ENVIRONMENT_DEV_CONFIG);
    });

    it('should get provider account seed phrase', () => {
      expect(accountServiceConfig.getProviderAccountSeedPhrase()).toStrictEqual(ALL_ENV.PROVIDER_ACCOUNT_SEED_PHRASE);
    });

    it('should get provider id', () => {
      expect(accountServiceConfig.getProviderId()).toStrictEqual(ALL_ENV.PROVIDER_ID);
    });

    it('should get SIWF URL', () => {
      expect(accountServiceConfig.getSiwfUrl()).toStrictEqual(ALL_ENV.SIWF_URL);
    });

    it('should get SIWF Domain', () => {
      expect(accountServiceConfig.getSiwfDomain()).toStrictEqual(ALL_ENV.SIWF_DOMAIN);
    });

    it('should get provider base url', () => {
      expect(accountServiceConfig.providerBaseUrl?.toString()).toStrictEqual(ALL_ENV.PROVIDER_BASE_URL?.toString());
    });

    it('should get provider api token', () => {
      expect(accountServiceConfig.providerApiToken).toStrictEqual(ALL_ENV.PROVIDER_ACCESS_TOKEN);
    });

    it('should get webhook failure threshold', () => {
      expect(accountServiceConfig.getWebhookFailureThreshold()).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_FAILURE_THRESHOLD as string, 10),
      );
    });

    it('should get health check success threshold', () => {
      expect(accountServiceConfig.getHealthCheckSuccessThreshold()).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_SUCCESS_THRESHOLD as string, 10),
      );
    });

    it('should get webhook retry interval seconds', () => {
      expect(accountServiceConfig.getWebhookRetryIntervalSeconds()).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get health check max retry interval seconds', () => {
      expect(accountServiceConfig.getHealthCheckMaxRetryIntervalSeconds()).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get health check max retries', () => {
      expect(accountServiceConfig.getHealthCheckMaxRetries()).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRIES as string, 10),
      );
    });

    it('should get page size', () => {
      expect(accountServiceConfig.getPageSize()).toStrictEqual(parseInt(ALL_ENV.PAGE_SIZE as string, 10));
    });

    it('should get debounce seconds', () => {
      expect(accountServiceConfig.getDebounceSeconds()).toStrictEqual(parseInt(ALL_ENV.DEBOUNCE_SECONDS as string, 10));
    });

    it('should get capacity limit', () => {
      expect(accountServiceConfig.getCapacityLimit()).toStrictEqual(JSON.parse(ALL_ENV.CAPACITY_LIMIT!));
    });
  });
});
