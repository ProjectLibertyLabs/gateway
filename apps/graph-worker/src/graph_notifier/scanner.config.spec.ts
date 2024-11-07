/* eslint-disable import/no-extraneous-dependencies */
import scannerConfig, { IScannerConfig } from './scanner.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, shouldFailBadValues } = configSetup<IScannerConfig>(scannerConfig);

describe('Scanner config', () => {
  const ALL_ENV: Record<string, string | undefined> = {
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: undefined,
    QUEUE_HIGH_WATER: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid scan interval should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'BLOCKCHAIN_SCAN_INTERVAL_SECONDS', [0, 'bad-value']));

    it('invalid queue high water limit should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'QUEUE_HIGH_WATER', [99, 'bad-value']));
  });

  describe('valid environment', () => {
    let scannerConf: IScannerConfig;
    beforeAll(async () => {
      scannerConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(scannerConf).toBeDefined();
    });

    it('should get scan interval', async () => {
      expect(scannerConf.blockchainScanIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.BLOCKCHAIN_SCAN_INTERVAL_SECONDS, 10),
      );
    });

    it('should get queue high water limit', async () => {
      expect(scannerConf.queueHighWater).toStrictEqual(parseInt(ALL_ENV.QUEUE_HIGH_WATER, 10));
    });

    it('should get trust unfinalized blocks', async () => {
      expect(scannerConf.trustUnfinalizedBlocks).toStrictEqual(
        ALL_ENV.TRUST_UNFINALIZED_BLOCKS === 'true' || ALL_ENV.TRUST_UNFINALIZED_BLOCKS === '1',
      );
    });
  });
});
