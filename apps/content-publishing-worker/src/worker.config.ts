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

export default registerAs('account-worker', (): IContentPublishingWorkerConfig => {
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

  return JoiUtils.validate<IContentPublishingWorkerConfig>(configs);
});
