import { describe, it, expect, beforeAll } from '@jest/globals';
import cacheConfig, { ICacheConfig } from './cache.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, validateMissing, shouldFailBadValues } = configSetup<ICacheConfig>(cacheConfig);

describe('Cache module config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    REDIS_URL: undefined,
    REDIS_OPTIONS: undefined,
    CACHE_KEY_PREFIX: undefined,
  };

  let urlEnv: object;
  let optionsEnv: object;

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });

    const { REDIS_OPTIONS: _unused1, ...restUrlEnv } = ALL_ENV;
    const { REDIS_URL: _unused2, ...restOptionsEnv } = ALL_ENV;
    urlEnv = restUrlEnv;
    optionsEnv = restOptionsEnv;
  });

  describe('invalid environment', () => {
    it('missing redis url & config should fail', async () => validateMissing(optionsEnv, 'REDIS_OPTIONS'));

    it('invalid redis url should fail', async () => shouldFailBadValues(urlEnv, 'REDIS_URL', ['invalid url']));

    it('missing cache key prefix should fail', async () =>
      validateMissing({ ...ALL_ENV, REDIS_OPTIONS: '{}' }, 'CACHE_KEY_PREFIX'));

    it('config with both redis url and config should fail', async () => {
      await expect(setupConfigService({ ...ALL_ENV, REDIS_OPTIONS: '{}' })).rejects.toBeDefined();
    });

    it('invalid redis options should fail', async () =>
      shouldFailBadValues(optionsEnv, 'REDIS_OPTIONS', ['{badKey:1000}', 1000, 'string', '[1,2]']));
  });

  describe('valid environment', () => {
    it('should be defined', async () => {
      const cacheConf = await setupConfigService(urlEnv);
      expect(cacheConf).toBeDefined();
    });

    it('should get cache key prefix', async () => {
      const cacheConf = await setupConfigService(urlEnv);
      expect(cacheConf.cacheKeyPrefix).toStrictEqual(ALL_ENV.CACHE_KEY_PREFIX?.toString());
    });

    it('should get redis config from url', async () => {
      const cacheConf = await setupConfigService({ ...urlEnv, REDIS_URL: 'redis://localhost:6379' });
      const options = {
        host: 'localhost',
        port: 6379,
        commandTimeout: 25000,
      };
      expect(cacheConf.redisOptions).toStrictEqual(options);
    });

    it('should parse rediss:// url for TLS config', async () => {
      const cacheConf = await setupConfigService({ ...urlEnv, REDIS_URL: 'rediss://localhost:6379' });
      expect(cacheConf.redisOptions.tls).toBeTruthy();
    });

    it('should get redis options with merged defaults', async () => {
      const options = {
        host: 'localhost',
        port: 6379,
        keepAliveTimeout: 300,
      };
      const cacheConf = await setupConfigService({ ...optionsEnv, REDIS_OPTIONS: JSON.stringify(options) });
      expect(cacheConf.redisOptions).toStrictEqual({ ...options, commandTimeout: 25000 });
    });

    it('should get redis options with overriden defaults', async () => {
      const options = {
        host: 'localhost',
        port: 6379,
        commandTimeout: 9999,
      };
      const cacheConf = await setupConfigService({ ...optionsEnv, REDIS_OPTIONS: JSON.stringify(options) });
      expect(cacheConf.redisOptions.commandTimeout).toStrictEqual(options.commandTimeout);
    });
  });
});
