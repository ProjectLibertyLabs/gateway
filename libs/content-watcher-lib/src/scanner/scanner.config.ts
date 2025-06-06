import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IScannerConfig {
  blockchainScanIntervalSeconds: number;
  queueHighWater: number;
}

export default registerAs('scanner', (): IScannerConfig => {
  const configs: JoiUtils.JoiConfig<IScannerConfig> = JoiUtils.normalizeConfigNames({
    blockchainScanIntervalSeconds: {
      label: 'BLOCKCHAIN_SCAN_INTERVAL_SECONDS',
      joi: Joi.number().min(1).default(6),
    },
    queueHighWater: {
      label: 'QUEUE_HIGH_WATER',
      joi: Joi.number().min(100).default(1000),
    },
  });

  return JoiUtils.validate<IScannerConfig>(configs);
});
