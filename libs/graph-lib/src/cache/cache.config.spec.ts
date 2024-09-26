/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, expect, beforeAll } from '@jest/globals';
import cacheConfig, { ICacheConfig } from './cache.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } = configSetup<ICacheConfig>(cacheConfig);

describe('Cache module config', () => {
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
    let cacheConf: ICacheConfig;
    beforeAll(async () => {
      cacheConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(cacheConf).toBeDefined();
    });

    it('should get redis url', () => {
      expect(cacheConf.redisUrl).toStrictEqual(ALL_ENV.REDIS_URL);
    });

    it('should get cache key prefix', () => {
      expect(cacheConf.cacheKeyPrefix).toStrictEqual(ALL_ENV.CACHE_KEY_PREFIX?.toString());
    });
  });
});
