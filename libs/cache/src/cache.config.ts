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
      joi: Joi.string()
        .optional()
        .custom((value, helpers) => {
          let parsed: RedisOptions;
          try {
            parsed = JSON.parse(value) as RedisOptions;
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
              return helpers.error('redisOptions.nonObject');
            }
          } catch (err) {
            return helpers.error('redisOptions.invalid');
          }
          return parsed;
        }, 'Custom JSON parser')
        .optional()
        .messages({
          'redisOptions.invalid': 'REDIS_OPTIONS must be a valid JSON string',
          'redisOptions.nonObject': 'REDIS_OPTIONS must be a valid JSON object string, not an array or primitive',
        }),
    },
  };

  const validatedOptions = JoiUtils.validate<ICacheConfig>(configs);
  validatedOptions.redisOptions = { ...DEFAULT_REDIS_OPTIONS, ...validatedOptions.redisOptions };

  return validatedOptions;
});
