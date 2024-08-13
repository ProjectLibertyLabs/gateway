import dotenv from 'dotenv';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { configModuleOptions } from './env.config';

dotenv.config({ path: 'env.template', override: true });

const setupConfigService = async (envObj: any): Promise<ConfigService> => {
  jest.resetModules();
  Object.keys(process.env).forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
  const ALL_ENV: Record<string, string | undefined> = {
    REDIS_URL: undefined,
    FREQUENCY_URL: undefined,
    QUEUE_HIGH_WATER: undefined,
    API_PORT: undefined,
    DEBOUNCE_SECONDS: undefined,
    RECONNECTION_SERVICE_REQUIRED: undefined,
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: undefined,
    GRAPH_ENVIRONMENT_TYPE: undefined,
    PROVIDER_ACCOUNT_SEED_PHRASE: undefined,
    PROVIDER_ID: undefined,
    PROVIDER_BASE_URL: undefined,
    PROVIDER_ACCESS_TOKEN: undefined,
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    HEALTH_CHECK_SUCCESS_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRIES: undefined,
    CONNECTIONS_PER_PROVIDER_RESPONSE_PAGE: undefined,
    CAPACITY_LIMIT: undefined,
    CACHE_KEY_PREFIX: undefined,
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
      expect(graphServiceConfig.queueHighWater).toStrictEqual(parseInt(ALL_ENV.QUEUE_HIGH_WATER as string, 10));
    });

    it('should get api port', () => {
      expect(graphServiceConfig.apiPort).toStrictEqual(parseInt(ALL_ENV.API_PORT as string, 10));
    });

    it('should get reconnection service required', () => {
      expect(graphServiceConfig.reconnectionServiceRequired).toStrictEqual(
        ALL_ENV.RECONNECTION_SERVICE_REQUIRED === 'true',
      );
    });

    it('should get blockchain scan interval minutes', () => {
      expect(graphServiceConfig.blockchainScanIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.BLOCKCHAIN_SCAN_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get graph environment type', () => {
      expect(graphServiceConfig.graphEnvironmentType).toStrictEqual(ALL_ENV.GRAPH_ENVIRONMENT_TYPE);
    });

    it('should get provider account seed phrase', () => {
      expect(graphServiceConfig.providerAccountSeedPhrase).toStrictEqual(ALL_ENV.PROVIDER_ACCOUNT_SEED_PHRASE);
    });

    it('should get provider id', () => {
      expect(graphServiceConfig.providerId).toStrictEqual(ALL_ENV.PROVIDER_ID);
    });

    it('should get provider base url', () => {
      expect(graphServiceConfig.providerBaseUrl?.toString()).toStrictEqual(ALL_ENV.PROVIDER_BASE_URL?.toString());
    });

    it('should get provider api token', () => {
      expect(graphServiceConfig.providerApiToken).toStrictEqual(ALL_ENV.PROVIDER_ACCESS_TOKEN);
    });

    it('should get webhook failure threshold', () => {
      expect(graphServiceConfig.webhookFailureThreshold).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_FAILURE_THRESHOLD as string, 10),
      );
    });

    it('should get health check success threshold', () => {
      expect(graphServiceConfig.healthCheckSuccessThreshold).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_SUCCESS_THRESHOLD as string, 10),
      );
    });

    it('should get webhook retry interval seconds', () => {
      expect(graphServiceConfig.webhookRetryIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get health check max retry interval seconds', () => {
      expect(graphServiceConfig.healthCheckMaxRetryIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get health check max retries', () => {
      expect(graphServiceConfig.healthCheckMaxRetries).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRIES as string, 10),
      );
    });

    it('should get page size', () => {
      expect(graphServiceConfig.pageSize).toStrictEqual(
        parseInt(ALL_ENV.CONNECTIONS_PER_PROVIDER_RESPONSE_PAGE as string, 10),
      );
    });

    it('should get debounce seconds', () => {
      expect(graphServiceConfig.debounceSeconds).toStrictEqual(parseInt(ALL_ENV.DEBOUNCE_SECONDS as string, 10));
    });

    it('should get capacity limit', () => {
      expect(JSON.stringify(graphServiceConfig.capacityLimit)).toStrictEqual(ALL_ENV.CAPACITY_LIMIT!);
    });

    it('should get cache key prefix', () => {
      expect(graphServiceConfig.cacheKeyPrefix).toStrictEqual(ALL_ENV.CACHE_KEY_PREFIX?.toString());
    });
  });
});
