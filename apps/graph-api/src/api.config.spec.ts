import { describe, it, expect, beforeAll } from '@jest/globals';
import apiConfig, { IGraphApiConfig } from './api.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, shouldFailBadValues } = configSetup<IGraphApiConfig>(apiConfig);

describe('Account API Config', () => {
  const ALL_ENV: Record<string, string | undefined> = {
    API_BODY_JSON_LIMIT: undefined,
    API_PORT: undefined,
    API_TIMEOUT_MS: undefined,
    SIWF_NODE_RPC_URL: undefined,
    SIWF_URL: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid api port should fail', async () => shouldFailBadValues(ALL_ENV, 'API_PORT', [-1]));

    it('invalid api timeout limit should fail', async () => shouldFailBadValues(ALL_ENV, 'API_TIMEOUT_MS', [0]));
  });

  describe('valid environment', () => {
    let accountServiceConfig: IGraphApiConfig;
    beforeAll(async () => {
      accountServiceConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(accountServiceConfig).toBeDefined();
    });

    it('should get api port', () => {
      expect(accountServiceConfig.apiPort).toStrictEqual(parseInt(ALL_ENV.API_PORT as string, 10));
    });

    it('should get api timeout limit milliseconds', () => {
      expect(accountServiceConfig.apiTimeoutMs).toStrictEqual(parseInt(ALL_ENV.API_TIMEOUT_MS as string, 10));
    });

    it('should get api json body size limit', () => {
      expect(accountServiceConfig.apiBodyJsonLimit).toStrictEqual(ALL_ENV.API_BODY_JSON_LIMIT?.toString());
    });
  });
});
