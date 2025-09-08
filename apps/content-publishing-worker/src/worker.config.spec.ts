import { describe, it, expect, beforeAll } from '@jest/globals';
import workerConfig, { IContentPublishingWorkerConfig } from './worker.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } =
  configSetup<IContentPublishingWorkerConfig>(workerConfig);

describe('Content Publishing Worker Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: undefined,
    TRUST_UNFINALIZED_BLOCKS: undefined,
    ASSET_EXPIRATION_INTERVAL_SECONDS: undefined,
    BATCH_INTERVAL_SECONDS: undefined,
    BATCH_MAX_COUNT: undefined,
    ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: undefined,
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

    it('missing asset expiration interval should fail', async () =>
      validateMissing(ALL_ENV, 'ASSET_EXPIRATION_INTERVAL_SECONDS'));

    it('invalid asset expiration interval should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'ASSET_EXPIRATION_INTERVAL_SECONDS', [0, 'invalid']));

    it('missing asset upload verification delay should fail', async () =>
      validateMissing(ALL_ENV, 'ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS'));

    it('invalid asset upload verification delay should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS', [0, 'invalid']));

    it('missing batch interval should fail', async () => validateMissing(ALL_ENV, 'BATCH_INTERVAL_SECONDS'));

    it('invalid batch interval should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'BATCH_INTERVAL_SECONDS', [0, 'invalid']));

    it('missing batch max count should fail', async () => validateMissing(ALL_ENV, 'BATCH_MAX_COUNT'));

    it('invalid batch max count should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'BATCH_MAX_COUNT', [-1, 'invalid']));
  });

  describe('valid environment', () => {
    let accountServiceConfig: IContentPublishingWorkerConfig;
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

    it('should get asset expiration interval', () => {
      expect(accountServiceConfig.assetExpirationIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.ASSET_EXPIRATION_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get asset upload verification delay', () => {
      expect(accountServiceConfig.assetUploadVerificationDelaySeconds).toStrictEqual(
        parseInt(ALL_ENV.ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS as string, 10),
      );
    });

    it('should get batch interval', () => {
      expect(accountServiceConfig.batchIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.BATCH_INTERVAL_SECONDS as string, 10),
      );
    });

    it('should get max batch count', () => {
      expect(accountServiceConfig.batchMaxCount).toStrictEqual(parseInt(ALL_ENV.BATCH_MAX_COUNT as string, 10));
    });
  });
});
