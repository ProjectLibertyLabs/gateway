import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import { RedisOptions } from 'bullmq';
import Joi from 'joi';

export interface IQueueConfig {
  redisConnectionOptions: RedisOptions;
  cacheKeyPrefix: string;
}

export default registerAs('queue', (): IQueueConfig => {
  const configs: JoiUtils.JoiConfig<IQueueConfig> = {
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
  };

  return JoiUtils.validate<IQueueConfig>(configs);
});
