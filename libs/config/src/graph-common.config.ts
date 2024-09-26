import { JoiUtils } from '#config';
import { EnvironmentType } from '@dsnp/graph-sdk';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IGraphCommonConfig {
  debounceSeconds: number;
  graphEnvironmentType: EnvironmentType;
}

export default registerAs('graph-common', (): IGraphCommonConfig => {
  const configs: JoiUtils.JoiConfig<IGraphCommonConfig> = {
    debounceSeconds: {
      value: process.env.DEBOUNCE_SECONDS,
      joi: Joi.number().min(0).default(10),
    },
    graphEnvironmentType: {
      value: process.env.GRAPH_ENVIRONMENT_TYPE,
      joi: Joi.string().required().valid('Mainnet', 'TestnetPaseo'),
    },
  };

  return JoiUtils.validate<IGraphCommonConfig>(configs);
});
