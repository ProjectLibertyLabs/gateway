/* eslint-disable import/no-extraneous-dependencies */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import apiConfig, { IContentPublishingApiConfig } from './api.config';

const setupConfigService = async (envObj: any): Promise<IContentPublishingApiConfig> => {
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

  const config = moduleRef.get<IContentPublishingApiConfig>(apiConfig.KEY);
  return config;
};

describe('Content Publishing API Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    // API_BODY_JSON_LIMIT: undefined,
    API_PORT: undefined,
    // API_TIMEOUT_MS: undefined,
    FILE_UPLOAD_MAX_SIZE_IN_BYTES: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid api port should fail', async () => {
      const { API_PORT: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ API_PORT: -1, ...env })).rejects.toBeDefined();
    });

    // it('invalid api timeout limit should fail', async () => {
    //   const { API_TIMEOUT_MS: dummy, ...env } = ALL_ENV;
    //   await expect(setupConfigService({ API_TIMEOUT_MS: 0, ...env })).rejects.toBeDefined();
    // });

    it('missing file upload limit should fail', async () => {
      const { FILE_UPLOAD_MAX_SIZE_IN_BYTES: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService(env)).rejects.toBeDefined();
    });

    it('invalid file upload limit should fail', async () => {
      const { FILE_UPLOAD_MAX_SIZE_IN_BYTES: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ FILE_UPLOAD_MAX_SIZE_IN_BYTES: -1, ...env })).rejects.toBeDefined();
    });
  });

  describe('valid environment', () => {
    let contentPublishingServiceConfig: IContentPublishingApiConfig;
    beforeAll(async () => {
      contentPublishingServiceConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(contentPublishingServiceConfig).toBeDefined();
    });

    it('should get api port', () => {
      expect(contentPublishingServiceConfig.apiPort).toStrictEqual(parseInt(ALL_ENV.API_PORT as string, 10));
    });

    it('should get file upload limit', () => {
      expect(contentPublishingServiceConfig.fileUploadMaxSizeBytes).toStrictEqual(
        parseInt(ALL_ENV.FILE_UPLOAD_MAX_SIZE_IN_BYTES as string, 10),
      );
    });

    // it('should get api timeout limit milliseconds', () => {
    //   expect(contentPublishingServiceConfig.apiTimeoutMs).toStrictEqual(parseInt(ALL_ENV.API_TIMEOUT_MS as string, 10));
    // });

    // it('should get api json body size limit', () => {
    //   expect(contentPublishingServiceConfig.apiBodyJsonLimit).toStrictEqual(ALL_ENV.API_BODY_JSON_LIMIT?.toString());
    // });
  });
});
