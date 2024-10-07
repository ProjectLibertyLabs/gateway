/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import queueConfig, { IQueueConfig } from './queue.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } = configSetup<IQueueConfig>(queueConfig);

describe('Queue module config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    REDIS_URL: undefined,
    CACHE_KEY_PREFIX: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('missing redis url should fail', async () => validateMissing(ALL_ENV, 'REDIS_URL'));

    it('invalid redis url should fail', async () => shouldFailBadValues(ALL_ENV, 'REDIS_URL', ['invalid url']));

    it('missing cache key prefix should fail', async () => validateMissing(ALL_ENV, 'CACHE_KEY_PREFIX'));
  });

  describe('valid environment', () => {
    let queueConf: IQueueConfig;
    beforeAll(async () => {
      queueConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(queueConf).toBeDefined();
    });

    it('should get redis connection options', () => {
      const { hostname, port, username, password, pathname } = new URL(ALL_ENV.REDIS_URL);
      const expectedConfig = {
        host: hostname || undefined,
        port: port ? Number(port) : undefined,
        username: username || undefined,
        password: password || undefined,
        db: pathname?.length > 1 ? Number(pathname.slice(1)) : undefined,
      };
      expect(queueConf.redisConnectionOptions).toStrictEqual(expectedConfig);
    });

    it('should get cache key prefix', () => {
      expect(queueConf.cacheKeyPrefix).toStrictEqual(ALL_ENV.CACHE_KEY_PREFIX?.toString());
    });
  });
});
