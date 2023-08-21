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

describe('ContentPublishingConfigService', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    REDIS_URL: undefined,
    FREQUENCY_URL: undefined,
    PROVIDER_ID: undefined,
    PROVIDER_BASE_URL: undefined,
    PROVIDER_ACCESS_TOKEN: undefined,
    BLOCKCHAIN_SCAN_INTERVAL_MINUTES: undefined,
    QUEUE_HIGH_WATER: undefined,
    PROVIDER_ACCOUNT_SEED_PHRASE: undefined,
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    HEALTH_CHECK_SUCCESS_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRIES: undefined,
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

    it('missing provider id should fail', async () => {
      const { PROVIDER_ID: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).rejects.toBeDefined();
    });

    it('invalid provider id should fail', async () => {
      const { PROVIDER_ID: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ PROVIDER_ID: 'bad string', ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ PROVIDER_ID: '-1', ...env })).rejects.toBeDefined();
    });

    it('missing provider base url should fail', async () => {
      const { PROVIDER_BASE_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).rejects.toBeDefined();
    });

    it('invalid provider base url should fail', async () => {
      const { PROVIDER_BASE_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ PROVIDER_BASE_URL: 'invalid url', ...env })).rejects.toBeDefined();
    });

    it('missing provider access token should be ok', async () => {
      const { PROVIDER_ACCESS_TOKEN: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).resolves.toBeDefined();
    });

    it('empty provider access token should fail', async () => {
      const { PROVIDER_ACCESS_TOKEN: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ PROVIDER_ACCESS_TOKEN: '', ...env })).rejects.toBeDefined();
    });

    it('invalid scan interval should fail', async () => {
      const { BLOCKCHAIN_SCAN_INTERVAL_MINUTES: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ BLOCKCHAIN_SCAN_INTERVAL_MINUTES: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ BLOCKCHAIN_SCAN_INTERVAL_MINUTES: 0, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ BLOCKCHAIN_SCAN_INTERVAL_MINUTES: 'foo', ...env })).rejects.toBeDefined();
    });

    it('invalid queue high water should fail', async () => {
      const { QUEUE_HIGH_WATER: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ QUEUE_HIGH_WATER: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ QUEUE_HIGH_WATER: 99, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ QUEUE_HIGH_WATER: 'foo', ...env })).rejects.toBeDefined();
    });

    it('missing provider account seed phrase should fail', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ PROVIDER_ACCOUNT_SEED_PHRASE: undefined, ...env })).rejects.toBeDefined();
    });

    it('invalid provider account seed phrase should fail', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ PROVIDER_ACCOUNT_SEED_PHRASE: 'hello, world', ...env })).rejects.toBeDefined();
    });

    it('invalid webhook failure threshold should fail', async () => {
      const { WEBHOOK_FAILURE_THRESHOLD: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ WEBHOOK_FAILURE_THRESHOLD: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ WEBHOOK_FAILURE_THRESHOLD: 0, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ WEBHOOK_FAILURE_THRESHOLD: 'foo', ...env })).rejects.toBeDefined();
    });

    it('invalid health check success threshold should fail', async () => {
      const { HEALTH_CHECK_SUCCESS_THRESHOLD: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ HEALTH_CHECK_SUCCESS_THRESHOLD: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ HEALTH_CHECK_SUCCESS_THRESHOLD: 0, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ HEALTH_CHECK_SUCCESS_THRESHOLD: 'foo', ...env })).rejects.toBeDefined();
    });

    it('invalid webhook retry interval should fail', async () => {
      const { WEBHOOK_RETRY_INTERVAL_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ WEBHOOK_RETRY_INTERVAL_SECONDS: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ WEBHOOK_RETRY_INTERVAL_SECONDS: 0, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ WEBHOOK_RETRY_INTERVAL_SECONDS: 'foo', ...env })).rejects.toBeDefined();
    });

    it('invalid health check max retry interval should fail', async () => {
      const { HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: 0, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: 'foo', ...env })).rejects.toBeDefined();
    });

    it('invalid health check max retry interval should fail', async () => {
      const { HEALTH_CHECK_MAX_RETRIES: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ HEALTH_CHECK_MAX_RETRIES: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ HEALTH_CHECK_MAX_RETRIES: 'foo', ...env })).rejects.toBeDefined();
    });

    it('missing capacity limits should fail', async () => {
      const { CAPACITY_LIMIT: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ CAPACITY_LIMIT: undefined, ...env })).rejects.toBeDefined();
    });

    it('invalid capacity limit should fail', async () => {
      const { CAPACITY_LIMIT: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ CAPACITY_LIMIT: '{ "type": "bad type", "value": 0 }', ...env })).rejects.toBeDefined();
      await expect(async () => setupConfigService({ CAPACITY_LIMIT: '{ "type": "percentage", "value": -1 }', ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ CAPACITY_LIMIT: '{ "type": "percentage", "value": 101 }', ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ CAPACITY_LIMIT: '{ "type": "amount", "value": -1 }', ...env })).rejects.toBeDefined();
    });
  });

  describe('valid environment', () => {
    let contentPublishingConfigService: ConfigService;
    beforeAll(async () => {
      contentPublishingConfigService = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(contentPublishingConfigService).toBeDefined();
    });

    it('should get redis url', () => {
      expect(contentPublishingConfigService.redisUrl?.toString()).toStrictEqual(ALL_ENV.REDIS_URL?.toString());
    });

    it('should get frequency url', () => {
      expect(contentPublishingConfigService.frequencyUrl?.toString()).toStrictEqual(ALL_ENV.FREQUENCY_URL?.toString());
    });

    it('should get provider base url', () => {
      expect(contentPublishingConfigService.providerBaseUrl.toString()).toStrictEqual(ALL_ENV.PROVIDER_BASE_URL);
    });

    it('should get provider api token', () => {
      expect(contentPublishingConfigService.providerApiToken!.toString()).toStrictEqual(ALL_ENV.PROVIDER_ACCESS_TOKEN);
    });

    it('should get scan interval', () => {
      expect(contentPublishingConfigService.getBlockchainScanIntervalMinutes()).toStrictEqual(parseInt(ALL_ENV.BLOCKCHAIN_SCAN_INTERVAL_MINUTES as string, 10));
    });

    it('should get queue high water mark', () => {
      expect(contentPublishingConfigService.getQueueHighWater()).toStrictEqual(parseInt(ALL_ENV.QUEUE_HIGH_WATER as string, 10));
    });

    it('should get webhook failure threshold', () => {
      expect(contentPublishingConfigService.getWebhookFailureThreshold()).toStrictEqual(parseInt(ALL_ENV.WEBHOOK_FAILURE_THRESHOLD as string, 10));
    });

    it('should get health check success threshold', () => {
      expect(contentPublishingConfigService.getHealthCheckSuccessThreshold()).toStrictEqual(parseInt(ALL_ENV.HEALTH_CHECK_SUCCESS_THRESHOLD as string, 10));
    });

    it('should get webhook retry interval', () => {
      expect(contentPublishingConfigService.getWebhookRetryIntervalSeconds()).toStrictEqual(parseInt(ALL_ENV.WEBHOOK_RETRY_INTERVAL_SECONDS as string, 10));
    });

    it('should get health check max retry interval', () => {
      expect(contentPublishingConfigService.getHealthCheckMaxRetryIntervalSeconds()).toStrictEqual(parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS as string, 10));
    });

    it('should get health check max retries', () => {
      expect(contentPublishingConfigService.getHealthCheckMaxRetries()).toStrictEqual(parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRIES as string, 10));
    });

    it('should get provider id', () => {
      expect(contentPublishingConfigService.getProviderId()).toStrictEqual(ALL_ENV.PROVIDER_ID as string);
    });

    it('should get provider seed phrase', () => {
      expect(contentPublishingConfigService.getProviderAccountSeedPhrase()).toStrictEqual(ALL_ENV.PROVIDER_ACCOUNT_SEED_PHRASE);
    });

    it('should get capacity limit', () => {
      expect(contentPublishingConfigService.getCapacityLimit()).toStrictEqual(JSON.parse(ALL_ENV.CAPACITY_LIMIT!));
    });
  });
});
