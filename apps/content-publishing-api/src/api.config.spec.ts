/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import apiConfig, { IContentPublishingApiConfig } from './api.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } =
  configSetup<IContentPublishingApiConfig>(apiConfig);

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
    it('invalid api port should fail', async () => shouldFailBadValues(ALL_ENV, 'API_PORT', [-1]));

    it.todo('invalid api timeout limit should fail');
    it.todo('invalid json body size limit should fail');

    it('missing file upload limit should fail', async () => validateMissing(ALL_ENV, 'FILE_UPLOAD_MAX_SIZE_IN_BYTES'));

    it('invalid file upload limit should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'FILE_UPLOAD_MAX_SIZE_IN_BYTES', [-1]));
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
