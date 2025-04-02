import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import Joi from 'joi';

export interface ICacheConfig {
  redisUrl: string;
  cacheKeyPrefix: string;
  redisOptions: RedisOptions;
}

const DEFAULT_REDIS_OPTIONS: RedisOptions = {
  commandTimeout: 5000,
};

export default registerAs('cache', (): ICacheConfig => {
  const configs: JoiUtils.JoiConfig<ICacheConfig> = {
    redisUrl: {
      value: process.env.REDIS_URL,
      joi: Joi.string().uri().required(),
    },
    cacheKeyPrefix: {
      value: process.env.CACHE_KEY_PREFIX,
      joi: Joi.string().required(),
    },
    redisOptions: {
      value: process.env.REDIS_OPTIONS,
      joi: JoiUtils.jsonObjectSchema('REDIS_OPTIONS').optional(),
    },
  };

  const validatedOptions = JoiUtils.validate<ICacheConfig>(configs);
  validatedOptions.redisOptions = { ...DEFAULT_REDIS_OPTIONS, ...validatedOptions.redisOptions };

  return validatedOptions;
});
