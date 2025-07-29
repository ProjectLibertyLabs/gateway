import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IGraphWorkerConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
  webhookFailureThreshold: number;
  webhookRetryIntervalSeconds: number;
}

export default registerAs('graph-worker', (): IGraphWorkerConfig => {
  const configs: JoiUtils.JoiConfig<IGraphWorkerConfig> = JoiUtils.normalizeConfigNames({
    apiBodyJsonLimit: {
      label: 'API_BODY_JSON_LIMIT',
      joi: Joi.string().default('1mb'),
    },
    apiPort: {
      label: 'WORKER_API_PORT',
      value: process.env.WORKER_API_PORT || process.env.API_PORT,
      joi: Joi.number().min(0).default(3000),
    },
    apiTimeoutMs: {
      label: 'API_TIMEOUT_MS',
      joi: Joi.number().min(1).default(30000),
    },
    webhookFailureThreshold: {
      label: 'WEBHOOK_FAILURE_THRESHOLD',
      joi: Joi.number().min(1).default(3),
    },
    webhookRetryIntervalSeconds: {
      label: 'WEBHOOK_RETRY_INTERVAL_SECONDS',
      joi: Joi.number().min(1).default(10),
    },
  });

  Object.keys(process.env)
    .filter((key) => /_QUEUE_WORKER_CONCURRENCY/.test(key))
    .forEach((key) => {
      const queueName = key.replace(/_QUEUE_WORKER_CONCURRENCY/, '');
      configs[`${queueName}QueueWorkerConcurrency`] = {
        value: process.env[key],
        joi: Joi.number().max(250).min(1).label(key),
      };
    });

  return JoiUtils.validate<IGraphWorkerConfig>(configs);
});
