import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IContentPublishingWorkerConfig {
  blockchainScanIntervalSeconds: number;
  trustUnfinalizedBlocks: boolean;
  assetExpirationIntervalSeconds: number;
  assetUploadVerificationDelaySeconds: number;
  batchIntervalSeconds: number;
  batchMaxCount: number;
}

export default registerAs('content-publishing-worker', (): IContentPublishingWorkerConfig => {
  const configs: JoiUtils.JoiConfig<IContentPublishingWorkerConfig> = {
    blockchainScanIntervalSeconds: {
      value: process.env.BLOCKCHAIN_SCAN_INTERVAL_SECONDS,
      joi: Joi.number().min(1).default(6),
    },
    trustUnfinalizedBlocks: {
      value: process.env.TRUST_UNFINALIZED_BLOCKS,
      joi: Joi.bool().default(false),
    },
    assetExpirationIntervalSeconds: {
      value: process.env.ASSET_EXPIRATION_INTERVAL_SECONDS,
      joi: Joi.number().min(1).required(),
    },
    assetUploadVerificationDelaySeconds: {
      value: process.env.ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS,
      joi: Joi.number().min(1).required(),
    },
    batchIntervalSeconds: {
      value: process.env.BATCH_INTERVAL_SECONDS,
      joi: Joi.number().min(1).required(),
    },
    batchMaxCount: {
      value: process.env.BATCH_MAX_COUNT,
      joi: Joi.number().min(0).required(),
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

  return JoiUtils.validate<IContentPublishingWorkerConfig>(configs);
});
