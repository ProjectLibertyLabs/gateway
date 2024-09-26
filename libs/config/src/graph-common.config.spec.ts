/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import graphCommonConfig, { IGraphCommonConfig } from './graph-common.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } = configSetup<IGraphCommonConfig>(graphCommonConfig);

describe('Graph Common Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    DEBOUNCE_SECONDS: undefined,
    GRAPH_ENVIRONMENT_TYPE: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid debound seconds should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'DEBOUNCE_SECONDS', [-1, 'bad-value']));

    it('missing graph environment type should fail', async () => validateMissing(ALL_ENV, 'GRAPH_ENVIRONMENT_TYPE'));

    it('invalid graph environment type should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'GRAPH_ENVIRONMENT_TYPE', ['invalid']));
  });

  describe('valid environment', () => {
    let graphCommonConf: IGraphCommonConfig;
    beforeAll(async () => {
      graphCommonConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(graphCommonConf).toBeDefined();
    });

    it('should get debounce seconds', () => {
      expect(graphCommonConf.debounceSeconds).toStrictEqual(parseInt(ALL_ENV.DEBOUNCE_SECONDS, 10));
    });

    it('should get graph environment type', () => {
      expect(graphCommonConf.graphEnvironmentType).toStrictEqual(ALL_ENV.GRAPH_ENVIRONMENT_TYPE);
    });
  });
});
