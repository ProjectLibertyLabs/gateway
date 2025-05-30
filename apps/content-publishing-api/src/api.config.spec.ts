/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import apiConfig, { IContentPublishingApiConfig } from './api.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } =
  configSetup<IContentPublishingApiConfig>(apiConfig);

describe('Content Publishing API Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    API_BODY_JSON_LIMIT: undefined,
    API_PORT: undefined,
    API_TIMEOUT_MS: undefined,
    FILE_UPLOAD_MAX_SIZE_IN_BYTES: undefined,
    FILE_UPLOAD_COUNT_LIMIT: undefined,
    PROVIDER_ID: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid api port should fail', async () => shouldFailBadValues(ALL_ENV, 'API_PORT', [-1]));

    it('invalid json body size limit should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'API_BODY_JSON_LIMIT', [-1]));

    it('invalid api timeout limit should fail', async () => shouldFailBadValues(ALL_ENV, 'API_TIMEOUT_MS', [-1]));

    it('missing file upload limit should fail', async () => validateMissing(ALL_ENV, 'FILE_UPLOAD_MAX_SIZE_IN_BYTES'));

    it('missing file upload count limit should fail', async () => validateMissing(ALL_ENV, 'FILE_UPLOAD_COUNT_LIMIT'));

    it('invalid file upload limit should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'FILE_UPLOAD_MAX_SIZE_IN_BYTES', [-1]));

    it('invalid file upload count limit should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'FILE_UPLOAD_COUNT_LIMIT', [-1]));

    it('missing provider id should fail', async () => validateMissing(ALL_ENV, 'PROVIDER_ID'));

    it('invalid provider id should fail', async () => shouldFailBadValues(ALL_ENV, 'PROVIDER_ID', [-1, 'abc']));
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

    it('should get file upload count limit', () => {
      expect(contentPublishingServiceConfig.fileUploadCountLimit).toStrictEqual(
        parseInt(ALL_ENV.FILE_UPLOAD_COUNT_LIMIT as string, 10),
      );
    });

    it('should get api timeout limit milliseconds', () => {
      expect(contentPublishingServiceConfig.apiTimeoutMs).toStrictEqual(parseInt(ALL_ENV.API_TIMEOUT_MS as string, 10));
    });

    it('should get api json body size limit', () => {
      expect(contentPublishingServiceConfig.apiBodyJsonLimit).toStrictEqual(ALL_ENV.API_BODY_JSON_LIMIT?.toString());
    });

    it('should get provider id', () => {
      expect(contentPublishingServiceConfig.providerId.toString()).toStrictEqual(ALL_ENV.PROVIDER_ID.toString());
    });
  });
});
