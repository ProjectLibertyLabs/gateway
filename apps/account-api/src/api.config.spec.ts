/* eslint-disable import/no-extraneous-dependencies */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import apiConfig, { IAccountApiConfig } from './api.config';

const setupConfigService = async (envObj: any): Promise<IAccountApiConfig> => {
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
        load: [apiConfig],
      }),
    ],
    controllers: [],
    providers: [ConfigService],
  }).compile();

  await ConfigModule.envVariablesLoaded;

  const config = moduleRef.get<IAccountApiConfig>(apiConfig.KEY);
  return config;
};

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
    it('missing frequency http url should fail', async () => {
      const { FREQUENCY_HTTP_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).rejects.toBeDefined();
    });

    it('invalid frequency http url should fail', async () => {
      const { FREQUENCY_HTTP_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ FREQUENCY_HTTP_URL: 'invalid url', ...env })).rejects.toBeDefined();
    });

    it('invalid api port should fail', async () => {
      const { API_PORT: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ API_PORT: -1, ...env })).rejects.toBeDefined();
    });

    it('missing graph environment type should fail', async () => {
      const { GRAPH_ENVIRONMENT_TYPE: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).rejects.toBeDefined();
    });

    it('invalid graph environment type should fail', async () => {
      const { GRAPH_ENVIRONMENT_TYPE: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ GRAPH_ENVIRONMENT_TYPE: 'invalid', ...env })).rejects.toBeDefined();
    });

    it('invalid api timeout limit should fail', async () => {
      const { API_TIMEOUT_MS: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ API_TIMEOUT_MS: 0, ...env })).rejects.toBeDefined();
    });
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
