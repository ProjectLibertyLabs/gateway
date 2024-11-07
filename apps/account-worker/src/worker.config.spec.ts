/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import workerConfig, { IAccountWorkerConfig } from './worker.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, shouldFailBadValues } = configSetup<IAccountWorkerConfig>(workerConfig);

describe('Account Worker Config', () => {
  const ALL_ENV: Record<string, string | undefined> = {
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
    it('invalid scan interval should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'BLOCKCHAIN_SCAN_INTERVAL_SECONDS', [-1, 0, 'foo']));

    it('invalid trust unfinalized blocks should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'TRUST_UNFINALIZED_BLOCKS', ['some string', 27]));
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
