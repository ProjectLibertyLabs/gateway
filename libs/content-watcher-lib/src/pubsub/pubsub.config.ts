import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IPubSubConfig {
  webhookMaxRetries: number;
  webhookRetryIntervalSeconds: number;
}

export default registerAs('pubsub', (): IPubSubConfig => {
  const configs: JoiUtils.JoiConfig<IPubSubConfig> = {
    webhookMaxRetries: {
      value: process.env.WEBHOOK_FAILURE_THRESHOLD,
      joi: Joi.number().min(0).default(3),
    },
    webhookRetryIntervalSeconds: {
      value: process.env.WEBHOOK_RETRY_INTERVAL_SECONDS,
      joi: Joi.number().min(1).default(10),
    },
  };

  return JoiUtils.validate<IPubSubConfig>(configs);
});
