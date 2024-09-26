/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import reconnectionConfig, { IGraphReconnectionConfig } from './graph.reconnection.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, shouldFailBadValues } = configSetup<IGraphReconnectionConfig>(reconnectionConfig);

describe('Scanner config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    CONNECTIONS_PER_PROVIDER_RESPONSE_PAGE: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid page size should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'CONNECTIONS_PER_PROVIDER_RESPONSE_PAGE', [0, 'bad-value']));
  });

  describe('valid environment', () => {
    let scannerConf: IGraphReconnectionConfig;
    beforeAll(async () => {
      scannerConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(scannerConf).toBeDefined();
    });

    it('should get page size', async () => {
      expect(scannerConf.pageSize).toStrictEqual(parseInt(ALL_ENV.CONNECTIONS_PER_PROVIDER_RESPONSE_PAGE, 10));
    });
  });
});
