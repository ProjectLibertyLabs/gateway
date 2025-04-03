import { JoiUtils } from '#config';
import { normalizeConfigNames } from '#config/joi-utils';
import { registerAs } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
import { parseURL } from 'ioredis/built/utils';
import Joi from 'joi';

export interface ICacheConfig {
  // redisUrl: string;
  cacheKeyPrefix: string;
  redisOptions: RedisOptions;
}

type CacheValidationOptions = ICacheConfig & { redisUrl: string };

const DEFAULT_REDIS_OPTIONS: RedisOptions = {
  commandTimeout: 10_000,
};

export default registerAs('cache', (): ICacheConfig => {
  const configs: JoiUtils.JoiConfig<CacheValidationOptions> = normalizeConfigNames({
    redisUrl: {
      label: 'REDIS_URL',
      joi: Joi.string().uri().optional(),
    },
    cacheKeyPrefix: {
      label: 'CACHE_KEY_PREFIX',
      joi: Joi.string().required(),
    },
    redisOptions: {
      label: 'REDIS_OPTIONS',
      joi: JoiUtils.jsonObjectSchema.optional(),
    },
  });

  const validatedOptions = JoiUtils.validate<CacheValidationOptions>(configs);
  if (validatedOptions.redisOptions && validatedOptions.redisUrl) {
    throw new Error('Only one of REDIS_URL or REDIS_OPTIONS may be provided, not both');
  }

  if (!validatedOptions.redisOptions && !validatedOptions.redisUrl) {
    throw new Error('Either REDIS_URL or REDIS_OPTIONS must be provided');
  }

  if (validatedOptions.redisUrl) {
    validatedOptions.redisOptions = parseURL(validatedOptions.redisUrl);

    // Copying this code from ioredis, since their 'parseOptions' method is private and
    // also requires an existing Redis object.
    // Even though the RedisOptions interface indicates that 'tls' is an object,
    // the ioredis code explicity just sets it to 'true' if the protocol is 'rediss://'
    // https://github.com/redis/ioredis/blob/2ed6414339bdda3e427ed1e8484263cc4848f2ac/lib/Redis.ts#L725
    if (validatedOptions.redisUrl.startsWith('rediss:')) {
      (validatedOptions.redisOptions.tls as unknown as boolean) = true;
    }
    delete validatedOptions.redisUrl;
  }

  validatedOptions.redisOptions = { ...DEFAULT_REDIS_OPTIONS, ...validatedOptions.redisOptions };

  return validatedOptions;
});
