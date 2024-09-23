import { registerAs } from '@nestjs/config';
import Joi from 'joi';
import * as JoiUtil from '#config/joi-utils';

export interface IBlockchainConfig {
  frequencyUrl: URL;
}

export default registerAs('blockchain', (): IBlockchainConfig => {
  const configs: JoiUtil.JoiConfig<IBlockchainConfig> = {
    frequencyUrl: {
      value: process.env.FREQUENCY_URL,
      joi: Joi.string()
        .uri({ scheme: ['http', 'https', 'ws', 'wss'] })
        .required()
        .custom((v) => new URL(v)),
    },
  };

  return JoiUtil.validate<IBlockchainConfig>(configs);
});
