/* eslint-disable import/no-extraneous-dependencies */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import ipfsConfig, { IIpfsConfig } from './ipfs.config';

const setupConfigService = async (envObj: any): Promise<IIpfsConfig> => {
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
        load: [ipfsConfig],
      }),
    ],
    controllers: [],
    providers: [ConfigService],
  }).compile();

  await ConfigModule.envVariablesLoaded;

  const config = moduleRef.get<IIpfsConfig>(ipfsConfig.KEY);
  return config;
};

describe('IPFS config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    IPFS_ENDPOINT: undefined,
    IPFS_GATEWAY_URL: undefined,
    IPFS_BASIC_AUTH_USER: undefined,
    IPFS_BASIC_AUTH_SECRET: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  async function validateMissing(key: string) {
    const obj = { ...ALL_ENV };
    delete obj[key];
    await expect(setupConfigService(obj)).rejects.toBeDefined();
  }

  async function shouldFailBadValues(key: string, values: any[]) {
    const obj = { ...ALL_ENV };
    delete obj[key];
    await Promise.all(
      values.map((v) => {
        const badObj = { ...obj };
        badObj[key] = v;
        return expect(setupConfigService(badObj)).rejects.toBeDefined();
      }),
    );
  }

  describe('invalid environment', () => {
    it('missing IPFS endpoint should fail', async () => validateMissing('IPFS_ENDPOINT'));
    it('bad IPFS endpoint should fail', async () => shouldFailBadValues('IPFS_ENDPOINT', ['not-a-url']));

    it('missing IPFS gateway should fail', async () => validateMissing('IPFS_GATEWAY_URL'));
  });

  describe('valid environment', () => {
    let ipfsConf: IIpfsConfig;
    beforeAll(async () => {
      ipfsConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(ipfsConf).toBeDefined();
    });

    it('should get IPFS endpoint', async () => {
      expect(ipfsConf.ipfsEndpoint).toStrictEqual(new URL(ALL_ENV.IPFS_ENDPOINT));
    });

    it('should get IPFS gateway', async () => {
      expect(ipfsConf.ipfsGatewayUrl).toStrictEqual(ALL_ENV.IPFS_GATEWAY_URL);
    });

    it('should get IPFS user', async () => {
      expect(ipfsConf.ipfsBasicAuthUser).toStrictEqual(ALL_ENV.IPFS_BASIC_AUTH_USER);
    });

    it('should get IPFS auth secret', async () => {
      expect(ipfsConf.ipfsBasicAuthSecret).toStrictEqual(ALL_ENV.IPFS_BASIC_AUTH_SECRET);
    });
  });
});
