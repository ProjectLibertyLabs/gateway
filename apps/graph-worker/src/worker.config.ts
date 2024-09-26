import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IGraphWorkerConfig {
  debounceSeconds: number;
  healthCheckMaxRetries: number;
  healthCheckMaxRetryIntervalSeconds: number;
  healthCheckSuccessThreshold: number;
  providerApiToken?: string;
  providerBaseUrl?: string;
  reconnectionServiceRequired: boolean;
  webhookFailureThreshold: number;
  webhookRetryIntervalSeconds: number;
}

export default registerAs('graph-worker', (): IGraphWorkerConfig => {
  const configs: JoiUtils.JoiConfig<IGraphWorkerConfig> = {
    providerApiToken: {
      value: process.env.PROVIDER_ACCESS_TOKEN,
      joi: Joi.string().empty(''),
    },
    reconnectionServiceRequired: {
      value: process.env.RECONNECTION_SERVICE_REQUIRED,
      joi: Joi.boolean().default(false),
    },
    providerBaseUrl: {
      value: process.env.PROVIDER_BASE_URL,
      joi: Joi.string().uri().when('reconnectionServiceRequired', {
        is: true,
        then: Joi.required(),
      }),
    },
    healthCheckMaxRetries: {
      value: process.env.HEALTH_CHECK_MAX_RETRIES,
      joi: Joi.number().min(0).default(20),
    },
    healthCheckMaxRetryIntervalSeconds: {
      value: process.env.HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS,
      joi: Joi.number().min(1).default(64),
    },
    healthCheckSuccessThreshold: {
      value: process.env.HEALTH_CHECK_SUCCESS_THRESHOLD,
      joi: Joi.number().min(1).default(10),
    },
    debounceSeconds: {
      value: process.env.DEBOUNCE_SECONDS,
      joi: Joi.number().min(0).default(10),
    },
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
