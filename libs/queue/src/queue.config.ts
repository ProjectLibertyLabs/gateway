import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import { RedisOptions } from 'bullmq';
import Joi from 'joi';

export interface IQueueConfig {
  redisConnectionOptions: RedisOptions;
  cacheKeyPrefix: string;
}

type ExtendedQueueConfig = IQueueConfig & { extendedOptions: RedisOptions };

const DEFAULT_REDIS_OPTIONS: RedisOptions = {
  commandTimeout: 5000,
};

export default registerAs('queue', (): IQueueConfig => {
  const configs: JoiUtils.JoiConfig<ExtendedQueueConfig> = {
    cacheKeyPrefix: {
      value: process.env.CACHE_KEY_PREFIX,
      joi: Joi.string().required(),
    },
    redisConnectionOptions: {
      value: process.env.REDIS_URL,
      joi: Joi.string()
        .uri()
        .required()
        .custom((value: string) => {
          // Note: BullMQ doesn't honor a URL for the Redis connection, so we parse out
          // the host, port, username, password, etc.
          // We could pass REDIS_HOST, REDIS_PORT, etc, in the environment, but
          // trying to keep the # of environment variables from proliferating
          const url = new URL(value);
          const { hostname, port, username, password, pathname } = url;
          return {
            host: hostname || undefined,
            port: port ? Number(port) : undefined,
            username: username || undefined,
            password: password || undefined,
            db: pathname?.length > 1 ? Number(pathname.slice(1)) : undefined,
          };
        }),
    },
    extendedOptions: {
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

  const validatedOptions = JoiUtils.validate<ExtendedQueueConfig>(configs);
  validatedOptions.redisConnectionOptions = {
    ...validatedOptions.redisConnectionOptions,
    ...DEFAULT_REDIS_OPTIONS,
    ...validatedOptions?.extendedOptions,
  };
  delete validatedOptions.extendedOptions;

  return validatedOptions;
});
