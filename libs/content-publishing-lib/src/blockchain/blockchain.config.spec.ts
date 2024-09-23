/* eslint-disable import/no-extraneous-dependencies */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import blockchainConfig, { allowReadOnly, IBlockchainConfig } from './blockchain.config';

const setupConfigService = async (envObj: any, readOnlyOk = false): Promise<IBlockchainConfig> => {
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
        load: [readOnlyOk ? allowReadOnly : blockchainConfig],
      }),
    ],
    controllers: [],
    providers: [ConfigService],
  }).compile();

  await ConfigModule.envVariablesLoaded;

  const config = moduleRef.get<IBlockchainConfig>(blockchainConfig.KEY);
  return config;
};

describe('Blockchain module config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    FREQUENCY_URL: undefined,
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
    it('invalid frequency url should fail', async () => {
      const { FREQUENCY_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ FREQUENCY_URL: 'invalid url', ...env })).rejects.toBeDefined();
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

    it('missing provider ID should fail', async () => {
      const { PROVIDER_ID: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ PROVIDER_ID: undefined, ...env })).rejects.toBeDefined();
    });

    it('missing seed phrase should fail', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService(env)).rejects.toBeDefined();
    });

    it('missing seed phrase should activate read-only mode if allowed', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: dummy, ...env } = ALL_ENV;
      const accountConfigService = await setupConfigService(env, true);
      expect(accountConfigService.isDeployedReadOnly).toBeTruthy();
    });

    it('empty seed phrase should activate read-only mode if allowed', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: dummy, ...env } = ALL_ENV;
      const accountConfigService = await setupConfigService({ PROVIDER_ACCOUNT_SEED_PHRASE: '', ...env }, true);
      expect(accountConfigService.isDeployedReadOnly).toBeTruthy();
    });

    it('blank seed phrase should activate read-only mode if allowed', async () => {
      const { PROVIDER_ACCOUNT_SEED_PHRASE: dummy, ...env } = ALL_ENV;
      const accountConfigService = await setupConfigService({ PROVIDER_ACCOUNT_SEED_PHRASE: '    ', ...env }, true);
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

    it('should get frequency url', () => {
      const expectedUrl = new URL(ALL_ENV.FREQUENCY_URL).toString();
      expect(blockchainConf.frequencyUrl?.toString()).toStrictEqual(expectedUrl);
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
