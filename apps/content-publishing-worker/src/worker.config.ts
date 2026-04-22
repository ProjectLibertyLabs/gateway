import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IContentPublishingWorkerConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
  blockchainScanIntervalSeconds: number;
  trustUnfinalizedBlocks: boolean;
  assetExpirationIntervalSeconds: number;
  assetUploadVerificationDelaySeconds: number;
  batchIntervalSeconds: number;
  batchMaxCount: number;
  healthCheckMaxRetries: number;
  healthCheckMaxRetryIntervalSeconds: number;
  healthCheckSuccessThreshold: number;
  providerApiToken: string;
  webhookBaseUrl?: URL;
  webhookFailureThreshold: number;
  webhookRetryIntervalSeconds: number;
}

export function buildContentPublishingWorkerConfigs(): JoiUtils.JoiConfig<IContentPublishingWorkerConfig> {
  const configs: JoiUtils.JoiConfig<IContentPublishingWorkerConfig> = JoiUtils.normalizeConfigNames({
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
    blockchainScanIntervalSeconds: {
      label: 'BLOCKCHAIN_SCAN_INTERVAL_SECONDS',
      joi: Joi.number().min(1).default(6),
    },
    trustUnfinalizedBlocks: {
      label: 'TRUST_UNFINALIZED_BLOCKS',
      joi: Joi.bool().default(false),
    },
    assetExpirationIntervalSeconds: {
      label: 'ASSET_EXPIRATION_INTERVAL_SECONDS',
      joi: Joi.number().min(1).required(),
    },
    assetUploadVerificationDelaySeconds: {
      label: 'ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS',
      joi: Joi.number().min(1).required(),
    },
    batchIntervalSeconds: {
      label: 'BATCH_INTERVAL_SECONDS',
      joi: Joi.number().min(1).required(),
    },
    batchMaxCount: {
      label: 'BATCH_MAX_COUNT',
      joi: Joi.number().min(0).required(),
    },
    healthCheckMaxRetries: {
      label: 'HEALTH_CHECK_MAX_RETRIES',
      joi: Joi.number().min(4).default(20),
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
      label: 'PROVIDER_API_TOKEN',
      joi: Joi.string().min(20).optional(),
    },
    webhookBaseUrl: {
      label: 'WEBHOOK_BASE_URL',
      joi: Joi.string()
        .uri()
        .optional()
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

  return configs;
}

export default registerAs(
  'content-publishing-worker',
  (): IContentPublishingWorkerConfig =>
    JoiUtils.validate<IContentPublishingWorkerConfig>(buildContentPublishingWorkerConfigs()),
);
