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
