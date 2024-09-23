/* eslint-disable import/no-extraneous-dependencies */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import workerConfig, { IContentPublishingWorkerConfig } from './worker.config';

const setupConfigService = async (envObj: any): Promise<IContentPublishingWorkerConfig> => {
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

  const config = moduleRef.get<IContentPublishingWorkerConfig>(workerConfig.KEY);
  return config;
};

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

    it('missing asset expiration interval should fail', async () => {
      const { ASSET_EXPIRATION_INTERVAL_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService(env)).rejects.toBeDefined();
    });

    it('invalid asset expiration interval should fail', async () => {
      const { ASSET_EXPIRATION_INTERVAL_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ASSET_EXPIRATION_INTERVAL_SECONDS: 0, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ ASSET_EXPIRATION_INTERVAL_SECONDS: 'invalid', ...env })).rejects.toBeDefined();
    });

    it('missing asset upload verification delay should fail', async () => {
      const { ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService(env)).rejects.toBeDefined();
    });

    it('invalid asset upload verification delay should fail', async () => {
      const { ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: 0, ...env })).rejects.toBeDefined();
      await expect(
        setupConfigService({ ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: 'invalid', ...env }),
      ).rejects.toBeDefined();
    });

    it('missing batch interval should fail', async () => {
      const { BATCH_INTERVAL_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService(env)).rejects.toBeDefined();
    });

    it('invalid batch interval should fail', async () => {
      const { BATCH_INTERVAL_SECONDS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ BATCH_INTERVAL_SECONDS: 0, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ BATCH_INTERVAL_SECONDS: 'invalid', ...env })).rejects.toBeDefined();
    });

    it('missing batch max count should fail', async () => {
      const { BATCH_MAX_COUNT: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService(env)).rejects.toBeDefined();
    });

    it('invalid batch max count should fail', async () => {
      const { BATCH_MAX_COUNT: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ BATCH_MAX_COUNT: -1, ...env })).rejects.toBeDefined();
      await expect(setupConfigService({ BATCH_MAX_COUNT: 'invalid', ...env })).rejects.toBeDefined();
    });
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
