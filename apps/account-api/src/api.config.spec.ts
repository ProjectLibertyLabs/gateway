/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import apiConfig, { IAccountApiConfig } from './api.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } = configSetup<IAccountApiConfig>(apiConfig);

describe('Account API Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    API_BODY_JSON_LIMIT: undefined,
    API_PORT: undefined,
    API_TIMEOUT_MS: undefined,
    FREQUENCY_HTTP_URL: undefined,
    GRAPH_ENVIRONMENT_TYPE: undefined,
    SIWF_URL: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('missing frequency http url should fail', async () => validateMissing(ALL_ENV, 'FREQUENCY_HTTP_URL'));

    it('invalid frequency http url should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'FREQUENCY_HTTP_URL', ['invalid url']));

    it('invalid api port should fail', async () => shouldFailBadValues(ALL_ENV, 'API_PORT', [-1]));

    it('missing graph environment type should fail', async () => validateMissing(ALL_ENV, 'GRAPH_ENVIRONMENT_TYPE'));

    it('invalid graph environment type should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'GRAPH_ENVIRONMENT_TYPE', ['invalid']));

    it('invalid api timeout limit should fail', async () => shouldFailBadValues(ALL_ENV, 'API_TIMEOUT_MS', [0]));
  });

  describe('valid environment', () => {
    let accountServiceConfig: IAccountApiConfig;
    beforeAll(async () => {
      accountServiceConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(accountServiceConfig).toBeDefined();
    });

    it('should get frequency http url', () => {
      expect(accountServiceConfig.frequencyHttpUrl?.toString()).toStrictEqual(ALL_ENV.FREQUENCY_HTTP_URL?.toString());
    });

    it('should get api port', () => {
      expect(accountServiceConfig.apiPort).toStrictEqual(parseInt(ALL_ENV.API_PORT as string, 10));
    });

    it('should get graph environment type', () => {
      expect(accountServiceConfig.graphEnvironmentType).toStrictEqual(ALL_ENV.GRAPH_ENVIRONMENT_TYPE);
    });

    it('should get SIWF URL', () => {
      expect(accountServiceConfig.siwfUrl).toStrictEqual(ALL_ENV.SIWF_URL);
    });

    it('should get api timeout limit milliseconds', () => {
      expect(accountServiceConfig.apiTimeoutMs).toStrictEqual(parseInt(ALL_ENV.API_TIMEOUT_MS as string, 10));
    });

    it('should get api json body size limit', () => {
      expect(accountServiceConfig.apiBodyJsonLimit).toStrictEqual(ALL_ENV.API_BODY_JSON_LIMIT?.toString());
    });
  });
});
