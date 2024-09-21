/* eslint-disable import/no-extraneous-dependencies */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import cacheConfig, { ICacheConfig } from './cache.config';

const setupConfigService = async (envObj: any): Promise<ICacheConfig> => {
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
        load: [cacheConfig],
      }),
    ],
    controllers: [],
    providers: [ConfigService],
  }).compile();

  await ConfigModule.envVariablesLoaded;

  const config = moduleRef.get<ICacheConfig>(cacheConfig.KEY);
  return config;
};

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
    it('missing redis url should fail', async () => {
      const { REDIS_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).rejects.toBeDefined();
    });

    it('invalid redis url should fail', async () => {
      const { REDIS_URL: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ REDIS_URL: 'invalid url', ...env })).rejects.toBeDefined();
    });

    it('missing cache key prefix should fail', async () => {
      const { CACHE_KEY_PREFIX: dummy, ...env } = ALL_ENV;
      await expect(setupConfigService({ ...env })).rejects.toBeDefined();
    });
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
      expect(cacheConf.redisUrl?.toString()).toStrictEqual(ALL_ENV.REDIS_URL?.toString());
    });

    it('should get cache key prefix', () => {
      expect(cacheConf.cacheKeyPrefix).toStrictEqual(ALL_ENV.CACHE_KEY_PREFIX?.toString());
    });
  });
});
