import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IContentPublishingWorkerConfig {
  apiBodyJsonLimit: string;
  workerApiPort: number;
  apiTimeoutMs: number;
  blockchainScanIntervalSeconds: number;
  trustUnfinalizedBlocks: boolean;
  assetExpirationIntervalSeconds: number;
  assetUploadVerificationDelaySeconds: number;
  batchIntervalSeconds: number;
  batchMaxCount: number;
}

export default registerAs('content-publishing-worker', (): IContentPublishingWorkerConfig => {
  const configs: JoiUtils.JoiConfig<IContentPublishingWorkerConfig> = JoiUtils.normalizeConfigNames({
    apiBodyJsonLimit: {
      label: 'API_BODY_JSON_LIMIT',
      joi: Joi.string().default('1mb'),
    },
    workerApiPort: {
      label: 'WORKER_API_PORT',
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

  return JoiUtils.validate<IContentPublishingWorkerConfig>(configs);
});
