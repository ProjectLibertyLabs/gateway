import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IScannerConfig {
  blockchainScanIntervalSeconds: number;
  queueHighWater: number;
  trustUnfinalizedBlocks: boolean;
  reconnectionServiceRequired: boolean;
}

export default registerAs('scanner', (): IScannerConfig => {
  const configs: JoiUtils.JoiConfig<IScannerConfig> = {
    blockchainScanIntervalSeconds: {
      value: process.env.BLOCKCHAIN_SCAN_INTERVAL_SECONDS,
      joi: Joi.number().min(1).default(6),
    },
    queueHighWater: {
      value: process.env.QUEUE_HIGH_WATER,
      joi: Joi.number().min(100).default(1000),
    },
    trustUnfinalizedBlocks: {
      value: process.env.TRUST_UNFINALIZED_BLOCKS,
      joi: Joi.boolean().default(false),
    },
    reconnectionServiceRequired: {
      value: process.env.RECONNECTION_SERVICE_REQUIRED,
      joi: Joi.boolean().default(false),
    },
  };

  return JoiUtils.validate<IScannerConfig>(configs);
});