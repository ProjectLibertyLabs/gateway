import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IGraphWorkerConfig {
  webhookFailureThreshold: number;
  webhookRetryIntervalSeconds: number;
}

export default registerAs('graph-worker', (): IGraphWorkerConfig => {
  const configs: JoiUtils.JoiConfig<IGraphWorkerConfig> = {
    webhookFailureThreshold: {
      value: process.env.WEBHOOK_FAILURE_THRESHOLD,
      joi: Joi.number().min(1).default(3),
    },
    webhookRetryIntervalSeconds: {
      value: process.env.WEBHOOK_RETRY_INTERVAL_SECONDS,
      joi: Joi.number().min(1).default(10),
    },
  };

  return JoiUtils.validate<IGraphWorkerConfig>(configs);
});
