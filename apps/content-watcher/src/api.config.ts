import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IContentWatcherApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
}

export default registerAs('content-watcher-api', (): IContentWatcherApiConfig => {
  const configs: JoiUtils.JoiConfig<IContentWatcherApiConfig> = {
    apiBodyJsonLimit: {
      value: process.env.API_BODY_JSON_LIMIT,
      joi: Joi.string().default('1mb'),
    },
    apiPort: {
      value: process.env.API_PORT,
      joi: Joi.number().min(0).default(3000),
    },
    apiTimeoutMs: {
      value: process.env.API_TIMEOUT_MS,
      joi: Joi.number().min(1).default(30000),
    },
  };

  Object.keys(process.env)
    .filter((key) => /_QUEUE_WORKER_CONCURRENCY/.test(key))
    .forEach((key) => {
      const queueName = key.replace(/_QUEUE_WORKER_CONCURRENCY/, '');
      configs[`${queueName}QueueWorkerConcurrency`] = {
        value: process.env[key],
        joi: Joi.number().max(250).min(1),
      };
    });

  return JoiUtils.validate<IContentWatcherApiConfig>(configs);
});
