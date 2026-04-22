import { describe, it, expect, beforeAll } from '@jest/globals';
import workerConfig, { buildContentPublishingWorkerConfigs, IContentPublishingWorkerConfig } from './worker.config';
import configSetup from '#testlib/utils.config-tests';
import { requiredConfigs } from '#config/joi-utils';

const { setupConfigService, validateMissing, shouldFailBadValues, shouldBeOptional } =
  configSetup<IContentPublishingWorkerConfig>(workerConfig);

describe('Content Publishing Worker Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    ASSET_EXPIRATION_INTERVAL_SECONDS: undefined,
    ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: undefined,
    BATCH_INTERVAL_SECONDS: undefined,
    BATCH_MAX_COUNT: undefined,
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_MAX_RETRIES: undefined,
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: undefined,
    HEALTH_CHECK_SUCCESS_THRESHOLD: undefined,
    PROVIDER_API_TOKEN: undefined,
    TRUST_UNFINALIZED_BLOCKS: undefined,
    WEBHOOK_BASE_URL: undefined,
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  const requiredContentPublishingWorkerConfigKeys = (): string[] =>
    requiredConfigs(buildContentPublishingWorkerConfigs());

  describe('invalid environment', () => {
    it('requires the expected configs', async () => {
      expect(requiredContentPublishingWorkerConfigKeys().sort()).toEqual([
        'ASSET_EXPIRATION_INTERVAL_SECONDS',
        'ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS',
        'BATCH_INTERVAL_SECONDS',
        'BATCH_MAX_COUNT',
      ]);
    });

    it.each(requiredContentPublishingWorkerConfigKeys())(`missing %s fails validation`, async (keysToRemove) => {
      await validateMissing(ALL_ENV, keysToRemove);
    });

    it('WEBHOOK_BASE_URL is optional', async () => {
      await shouldBeOptional(ALL_ENV, 'WEBHOOK_BASE_URL');
    });

    it.each([
      { configName: 'ASSET_EXPIRATION_INTERVAL_SECONDS', values: [0, 'invalid'] },
      { configName: 'ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS', values: [0, 'invalid'] },
      { configName: 'BATCH_INTERVAL_SECONDS', values: [0, 'invalid'] },
      { configName: 'BATCH_MAX_COUNT', values: [-1, 'invalid'] },
      { configName: 'BLOCKCHAIN_SCAN_INTERVAL_SECONDS', values: ['invalid', 0] },
      { configName: 'HEALTH_CHECK_MAX_RETRIES', values: ['some string', -1] },
      { configName: 'HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS', values: ['some string', 0] },
      { configName: 'HEALTH_CHECK_SUCCESS_THRESHOLD', values: ['some string', 0] },
      { configName: 'PROVIDER_API_TOKEN', values: ['tooshort', 0] },
      { configName: 'TRUST_UNFINALIZED_BLOCKS', values: ['some string', 0] },
      { configName: 'WEBHOOK_BASE_URL', values: ['not.a.url', 123] },
      { configName: 'WEBHOOK_FAILURE_THRESHOLD', values: ['some string', 0] },
      { configName: 'WEBHOOK_RETRY_INTERVAL_SECONDS', values: ['some string', 0] },
    ])(`$testType $configName fails`, async ({ configName, values }) => {
      await shouldFailBadValues(ALL_ENV, configName, values);
    });
  });

  describe('valid environment', () => {
    let contentPublishingServiceConfig: IContentPublishingWorkerConfig;
    beforeAll(async () => {
      contentPublishingServiceConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(contentPublishingServiceConfig).toBeDefined();
    });

    it('should get scan interval', () => {
      expect(contentPublishingServiceConfig.blockchainScanIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.BLOCKCHAIN_SCAN_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get finalized blocks trust parameter', () => {
      expect(contentPublishingServiceConfig.trustUnfinalizedBlocks).toStrictEqual(
        JSON.parse(ALL_ENV.TRUST_UNFINALIZED_BLOCKS!),
      );
    });

    it('should get asset expiration interval', () => {
      expect(contentPublishingServiceConfig.assetExpirationIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.ASSET_EXPIRATION_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get asset upload verification delay', () => {
      expect(contentPublishingServiceConfig.assetUploadVerificationDelaySeconds).toStrictEqual(
        parseInt(ALL_ENV.ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS as string, 10),
      );
    });

    it('should get batch interval', () => {
      expect(contentPublishingServiceConfig.batchIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.BATCH_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get max batch count', () => {
      expect(contentPublishingServiceConfig.batchMaxCount).toStrictEqual(
        parseInt(ALL_ENV.BATCH_MAX_COUNT as string, 10),
      );
    });
  });
});
