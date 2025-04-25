/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import blockchainConfig, { allowReadOnly, IBlockchainConfig } from './blockchain.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } = configSetup<IBlockchainConfig>(blockchainConfig);
const { setupConfigService: setupConfigServiceReadOnly } = configSetup<IBlockchainConfig>(allowReadOnly);

describe('Blockchain module config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    FREQUENCY_TIMEOUT_SECS: undefined,
    FREQUENCY_API_WS_URL: undefined,
    PROVIDER_ACCOUNT_SEED_PHRASE: undefined,
    PROVIDER_ID: undefined,
    CAPACITY_LIMIT: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('missing frequency API web socket url should fail', async () =>
      validateMissing(ALL_ENV, 'FREQUENCY_API_WS_URL'));
    it('invalid frequency API web socket url should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'FREQUENCY_API_WS_URL', ['invalid url']));

    it('missing capacity limits should fail', async () => validateMissing(ALL_ENV, 'CAPACITY_LIMIT'));

    it('invalid capacity limit should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'CAPACITY_LIMIT', [
        '{ badjson }',
        '{ "type": "bad type", "value": 0 }',
        '{ "type": "percentage", "value": -1 }',
        '{ "type": "percentage", "value": 101 }',
        '{ "type": "amount", "value": -1 }',
      ]));

    it('missing provider ID should fail', async () => validateMissing(ALL_ENV, 'PROVIDER_ID'));

    it('missing seed phrase should fail', async () => validateMissing(ALL_ENV, 'PROVIDER_ACCOUNT_SEED_PHRASE'));

    it('missing seed phrase should activate read-only mode if allowed', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: _dummy, ...env } = ALL_ENV;
      const accountConfigService = await setupConfigServiceReadOnly(env);
      expect(accountConfigService.isDeployedReadOnly).toBeTruthy();
    });

    it('empty seed phrase should activate read-only mode if allowed', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: _dummy, ...env } = ALL_ENV;
      const accountConfigService = await setupConfigServiceReadOnly({ PROVIDER_ACCOUNT_SEED_PHRASE: '', ...env });
      expect(accountConfigService.isDeployedReadOnly).toBeTruthy();
    });

    it('blank seed phrase should activate read-only mode if allowed', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: _dummy, ...env } = ALL_ENV;
      const accountConfigService = await setupConfigServiceReadOnly({ PROVIDER_ACCOUNT_SEED_PHRASE: '    ', ...env });
      expect(accountConfigService.isDeployedReadOnly).toBeTruthy();
    });
  });

  describe('valid environment', () => {
    let blockchainConf: IBlockchainConfig;
    beforeAll(async () => {
      blockchainConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(blockchainConf).toBeDefined();
    });

    it('should get frequency timeout', () => {
      expect(blockchainConf.frequencyTimeoutSecs).toStrictEqual(parseInt(ALL_ENV.FREQUENCY_TIMEOUT_SECS, 10));
    });

    it('should get frequency API web socket url', () => {
      const expectedUrl = new URL(ALL_ENV.FREQUENCY_API_WS_URL).toString();
      expect(blockchainConf.frequencyApiWsUrl?.toString()).toStrictEqual(expectedUrl);
    });

    it('should get provider account seed phrase and not be readonly', () => {
      expect(blockchainConf.providerSeedPhrase).toStrictEqual(ALL_ENV.PROVIDER_ACCOUNT_SEED_PHRASE);
      expect(blockchainConf.isDeployedReadOnly).toStrictEqual(false);
    });

    it('should get provider id', () => {
      expect(blockchainConf.providerId.toString()).toStrictEqual(ALL_ENV.PROVIDER_ID);
    });

    it('should get capacity limit', () => {
      expect(JSON.stringify(blockchainConf.capacityLimit)).toStrictEqual(ALL_ENV.CAPACITY_LIMIT!);
    });
  });
});
