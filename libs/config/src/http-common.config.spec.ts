/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import httpConfig, { IHttpCommonConfig } from './http-common.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, shouldFailBadValues } = configSetup<IHttpCommonConfig>(httpConfig);

describe('HTTP config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    HTTP_RESPONSE_TIMEOUT_MS: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid http response timeout should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'HTTP_RESPONSE_TIMEOUT_MS', [-1, 'invalid']));

    it('should fail when HTTP_RESPONSE_TIMEOUT_MS is greater than or equal to API_TIMEOUT_MS', async () => {
      process.env.API_TIMEOUT_MS = '30000';
      await shouldFailBadValues(ALL_ENV, 'HTTP_RESPONSE_TIMEOUT_MS', [30000, 31000]);
    });

    it('should show specific error message when HTTP_RESPONSE_TIMEOUT_MS exceeds API_TIMEOUT_MS', async () => {
      process.env.API_TIMEOUT_MS = '30000';
      const testEnv = { ...ALL_ENV, HTTP_RESPONSE_TIMEOUT_MS: '35000' };

      await expect(setupConfigService(testEnv)).rejects.toThrow(
        'Validation failed:\n        "HTTP_RESPONSE_TIMEOUT_MS" must be less than or equal to 29999. "HTTP_RESPONSE_TIMEOUT_MS" failed custom validation',
      );
    });
  });

  describe('default environment', () => {
    let config: IHttpCommonConfig;
    beforeAll(async () => {
      // Remove entries that have defaults set
      const { HTTP_RESPONSE_TIMEOUT_MS: _dummy, ...env } = ALL_ENV;
      config = await setupConfigService(env);
    });

    it('should be defined', () => {
      expect(config).toBeDefined();
    });

    it('should get response timeout milliseconds', () => {
      expect(config.httpResponseTimeoutMS).toStrictEqual(3000);
    });
  });

  describe('valid environment', () => {
    let conf: IHttpCommonConfig;
    beforeAll(async () => {
      conf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(conf).toBeDefined();
    });

    it('should get response timeout milliseconds', () => {
      expect(conf.httpResponseTimeoutMS).toStrictEqual(parseInt(ALL_ENV.HTTP_RESPONSE_TIMEOUT_MS, 10));
    });
  });
});
