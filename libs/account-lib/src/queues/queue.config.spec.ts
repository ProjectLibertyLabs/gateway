/* eslint-disable import/no-extraneous-dependencies */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { ConfigModule, ConfigService } from '@nestjs/config';
import queueConfig, { IQueueConfig } from './queue.config';

const setupConfigService = async (envObj: any): Promise<IQueueConfig> => {
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
        load: [queueConfig],
      }),
    ],
    controllers: [],
    providers: [ConfigService],
  }).compile();

  await ConfigModule.envVariablesLoaded;

  const config = moduleRef.get<IQueueConfig>(queueConfig.KEY);
  return config;
};

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
