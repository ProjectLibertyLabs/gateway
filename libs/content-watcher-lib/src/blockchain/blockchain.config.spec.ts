/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import blockchainConfig, { IBlockchainConfig } from './blockchain.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } = configSetup<IBlockchainConfig>(blockchainConfig);

describe('Blockchain module config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    FREQUENCY_URL: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('missing frequency url should fail', async () => validateMissing(ALL_ENV, 'FREQUENCY_URL'));
    it('invalid frequency url should fail', async () => shouldFailBadValues(ALL_ENV, 'FREQUENCY_URL', ['invalid url']));
  });

  describe('valid environment', () => {
    let blockchainConf: IBlockchainConfig;
    beforeAll(async () => {
      blockchainConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(blockchainConf).toBeDefined();
    });

    it('should get frequency url', () => {
      const expectedUrl = new URL(ALL_ENV.FREQUENCY_URL).toString();
      expect(blockchainConf.frequencyUrl?.toString()).toStrictEqual(expectedUrl);
    });
  });
});
