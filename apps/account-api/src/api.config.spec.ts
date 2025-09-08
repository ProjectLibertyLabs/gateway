import { describe, it, expect, beforeAll } from '@jest/globals';
import apiConfig, { IAccountApiConfig } from './api.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues, shouldBeOptional } =
  configSetup<IAccountApiConfig>(apiConfig);

describe('Account API Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    API_BODY_JSON_LIMIT: undefined,
    API_PORT: undefined,
    API_TIMEOUT_MS: undefined,
    SIWF_NODE_RPC_URL: undefined,
    GRAPH_ENVIRONMENT_TYPE: undefined,
    SIWF_URL: undefined,
    SIWF_V2_URL: undefined,
    SIWF_V2_URI_VALIDATION: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid SIWF Node RPC url should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'SIWF_NODE_RPC_URL', ['invalid url']));

    it('invalid api port should fail', async () => shouldFailBadValues(ALL_ENV, 'API_PORT', [-1]));

    it('missing graph environment type should fail', async () => validateMissing(ALL_ENV, 'GRAPH_ENVIRONMENT_TYPE'));

    it('invalid graph environment type should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'GRAPH_ENVIRONMENT_TYPE', ['invalid']));

    it('invalid api body json limit should fail', async () => shouldFailBadValues(ALL_ENV, 'API_BODY_JSON_LIMIT', [0]));

    it('invalid api timeout limit should fail', async () => shouldFailBadValues(ALL_ENV, 'API_TIMEOUT_MS', [0]));

    it('invalid url for SIWF_V2_URL', async () =>
      shouldFailBadValues(ALL_ENV, 'SIWF_V2_URL', [
        'sdfdsf',
        '["http://somedomain.org", "baduri"]',
        '["http://somedomain.org", ""]',
        '[]', // note, we explicitly reject an empty array; omitted value, `undefined` or empty string is the correct syntax for no value supplied
      ]));
  });

  describe('valid environment', () => {
    let accountServiceConfig: IAccountApiConfig;
    beforeAll(async () => {
      accountServiceConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(accountServiceConfig).toBeDefined();
    });

    it('should get SIWF Node RPC url', () => {
      expect(accountServiceConfig.siwfNodeRpcUrl?.toString()).toStrictEqual(ALL_ENV.SIWF_NODE_RPC_URL?.toString());
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

    it('missing SIWF V2 URL should be OK', async () => shouldBeOptional(ALL_ENV, 'SIWF_V2_URI_VALIDATION'));

    it('should get SIWF V2 URL', () => {
      expect(accountServiceConfig.siwfV2Url).toStrictEqual(ALL_ENV.SIWF_V2_URL);
    });

    it.each([
      ['https://example.com/login'],
      ['example://login'],
      ['localhost'],
      ['localhost:3030/login/path'],
      ['["https://example.com","example://login","localhost","localhost:3030/login/path"]'],
    ])('should get SIWF V2 URI VALIDATION for %s', async (value) => {
      ALL_ENV.SIWF_V2_URI_VALIDATION = value;
      accountServiceConfig = await setupConfigService(ALL_ENV);
      let expectedValue: string[] = [value];
      try {
        // If value parses as a JSON array, keep it
        expectedValue = JSON.parse(value);
      } catch {
        // keep original value
      }
      expect(accountServiceConfig.siwfV2URIValidation).toStrictEqual(expectedValue);
    });

    it('should get api timeout limit milliseconds', () => {
      expect(accountServiceConfig.apiTimeoutMs).toStrictEqual(parseInt(ALL_ENV.API_TIMEOUT_MS as string, 10));
    });

    it('should get api json body size limit', () => {
      expect(accountServiceConfig.apiBodyJsonLimit).toStrictEqual(ALL_ENV.API_BODY_JSON_LIMIT?.toString());
    });
  });
});
