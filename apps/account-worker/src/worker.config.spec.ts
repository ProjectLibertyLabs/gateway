/* eslint-disable import/no-extraneous-dependencies */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import workerConfig, { IAccountWorkerConfig } from './worker.config';

const setupConfigService = async (envObj: any): Promise<IAccountWorkerConfig> => {
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
        ignoreEnvFile: true,
        load: [workerConfig],
      }),
    ],
    controllers: [],
    providers: [ConfigService],
  }).compile();

  await ConfigModule.envVariablesLoaded;

  const config = moduleRef.get<IAccountWorkerConfig>(workerConfig.KEY);
  return config;
};

describe('Account Worker Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: undefined,
    TRUST_UNFINALIZED_BLOCKS: undefined,
    WEBHOOK_BASE_URL: undefined,
    PROVIDER_ACCESS_TOKEN: undefined,
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    HEALTH_CHECK_SUCCESS_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRIES: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid scan interval should fail', async () => {
      const { BLOCKCHAIN_SCAN_INTERVAL_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ BLOCKCHAIN_SCAN_INTERVAL_SECONDS: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ BLOCKCHAIN_SCAN_INTERVAL_SECONDS: 0, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ BLOCKCHAIN_SCAN_INTERVAL_SECONDS: 'foo', ...env })).rejects.toBeDefined();
    });

    it('invalid trust unfinalized blocks should fail', async () => {
      const { TRUST_UNFINALIZED_BLOCKS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ TRUST_UNFINALIZED_BLOCKS: 'some string', ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ TRUST_UNFINALIZED_BLOCKS: 27, ...env })).rejects.toBeDefined();
    });
  });

  describe('valid environment', () => {
    let accountServiceConfig: IAccountWorkerConfig;
    beforeAll(async () => {
      accountServiceConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(accountServiceConfig).toBeDefined();
    });

    it('should get scan interval', () => {
      expect(accountServiceConfig.blockchainScanIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.BLOCKCHAIN_SCAN_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get finalized blocks trust parameter', () => {
      expect(accountServiceConfig.trustUnfinalizedBlocks).toStrictEqual(JSON.parse(ALL_ENV.TRUST_UNFINALIZED_BLOCKS!));
    });

    it('should get provider base url', () => {
      expect(accountServiceConfig.webhookBaseUrl?.toString()).toStrictEqual(ALL_ENV.WEBHOOK_BASE_URL?.toString());
    });

    it('should get provider api token', () => {
      expect(accountServiceConfig.providerApiToken).toStrictEqual(ALL_ENV.PROVIDER_ACCESS_TOKEN);
    });

    it('should get webhook failure threshold', () => {
      expect(accountServiceConfig.webhookFailureThreshold).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_FAILURE_THRESHOLD as string, 10),
      );
    });

    it('should get health check success threshold', () => {
      expect(accountServiceConfig.healthCheckSuccessThreshold).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_SUCCESS_THRESHOLD as string, 10),
      );
    });

    it('should get webhook retry interval seconds', () => {
      expect(accountServiceConfig.webhookRetryIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get health check max retry interval seconds', () => {
      expect(accountServiceConfig.healthCheckMaxRetryIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get health check max retries', () => {
      expect(accountServiceConfig.healthCheckMaxRetries).toStrictEqual(
        parseInt(ALL_ENV.HEALTH_CHECK_MAX_RETRIES as string, 10),
      );
    });
  });
});
