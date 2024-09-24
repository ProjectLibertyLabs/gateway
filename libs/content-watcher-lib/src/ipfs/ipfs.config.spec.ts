/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import ipfsConfig, { IIpfsConfig } from './ipfs.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } = configSetup<IIpfsConfig>(ipfsConfig);

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

  describe('invalid environment', () => {
    it('missing IPFS endpoint should fail', async () => validateMissing(ALL_ENV, 'IPFS_ENDPOINT'));
    it('bad IPFS endpoint should fail', async () => shouldFailBadValues(ALL_ENV, 'IPFS_ENDPOINT', ['not-a-url']));

    it('missing IPFS gateway should fail', async () => validateMissing(ALL_ENV, 'IPFS_GATEWAY_URL'));
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
      expect(ipfsConf.ipfsBasicAuthUser || undefined).toStrictEqual(ALL_ENV.IPFS_BASIC_AUTH_USER);
    });

    it('should get IPFS auth secret', async () => {
      expect(ipfsConf.ipfsBasicAuthSecret || undefined).toStrictEqual(ALL_ENV.IPFS_BASIC_AUTH_SECRET);
    });
  });
});
