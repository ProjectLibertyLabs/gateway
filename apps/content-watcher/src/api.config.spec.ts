/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import apiConfig, { IContentWatcherApiConfig } from './api.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, shouldFailBadValues } = configSetup<IContentWatcherApiConfig>(apiConfig);

describe('Content Watcher API config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    API_PORT: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid API port should fail', async () => shouldFailBadValues(ALL_ENV, 'API_PORT', [-1, 'bad port']));
  });

  describe('valid environment', () => {
    let apiConf: IContentWatcherApiConfig;
    beforeAll(async () => {
      apiConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(apiConf).toBeDefined();
    });

    it('should get API port', async () => {
      expect(apiConf.apiPort).toStrictEqual(parseInt(ALL_ENV.API_PORT, 10));
    });
  });
});
