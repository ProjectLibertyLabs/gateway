import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface ICacheConfig {
  redisUrl: URL;
  cacheKeyPrefix: string;
}

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
  };

  return JoiUtils.validate<ICacheConfig>(configs);
});
