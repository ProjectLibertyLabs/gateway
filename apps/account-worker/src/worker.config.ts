import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IAccountWorkerConfig {
  blockchainScanIntervalSeconds: number;
  healthCheckMaxRetries: number;
  healthCheckMaxRetryIntervalSeconds: number;
  healthCheckSuccessThreshold: number;
  providerApiToken: string;
  trustUnfinalizedBlocks: boolean;
  webhookBaseUrl: URL;
  webhookFailureThreshold: number;
  webhookRetryIntervalSeconds: number;
}

export default registerAs('account-worker', (): IAccountWorkerConfig => {
  const configs: JoiUtils.JoiConfig<IAccountWorkerConfig> = JoiUtils.normalizeConfigNames({
    blockchainScanIntervalSeconds: {
      label: 'BLOCKCHAIN_SCAN_INTERVAL_SECONDS',
      joi: Joi.number().min(1).default(6),
    },
    healthCheckMaxRetries: {
      label: 'HEALTH_CHECK_MAX_RETRIES',
      joi: Joi.number().min(0).default(20),
    },
    healthCheckMaxRetryIntervalSeconds: {
      label: 'HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS',
      joi: Joi.number().min(1).default(64),
    },
    healthCheckSuccessThreshold: {
      label: 'HEALTH_CHECK_SUCCESS_THRESHOLD',
      joi: Joi.number().min(1).default(10),
    },
    providerApiToken: {
      label: 'PROVIDER_ACCESS_TOKEN',
      joi: Joi.string().default(''),
    },
    trustUnfinalizedBlocks: {
      label: 'TRUST_UNFINALIZED_BLOCKS',
      joi: Joi.bool().default(false),
    },
    webhookBaseUrl: {
      label: 'WEBHOOK_BASE_URL',
      joi: Joi.string()
        .uri()
        .required()
        .custom((v) => new URL(v)),
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

  return JoiUtils.validate<IAccountWorkerConfig>(configs);
});
