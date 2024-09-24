import { JoiUtils } from '#config';
import { EnvironmentType } from '@dsnp/graph-sdk';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IGraphApiConfig {
  // apiBodyJsonLimit: string;
  apiPort: number;
  // apiTimeoutMs: number;
  graphEnvironmentType: keyof EnvironmentType;
}

export default registerAs('account-api', (): IGraphApiConfig => {
  const configs: JoiUtils.JoiConfig<IGraphApiConfig> = {
    // apiBodyJsonLimit: {
    //   value: process.env.API_BODY_JSON_LIMIT,
    //   joi: Joi.string().default('1mb'),
    // },
    apiPort: {
      value: process.env.API_PORT,
      joi: Joi.number().min(0).default(3000),
    },
    // apiTimeoutMs: {
    //   value: process.env.API_TIMEOUT_MS,
    //   joi: Joi.number().min(1).default(5000),
    // },
    graphEnvironmentType: {
      value: process.env.GRAPH_ENVIRONMENT_TYPE,
      joi: Joi.string().required().valid('Mainnet', 'TestnetPaseo'),
    },
  };

  return JoiUtils.validate<IGraphApiConfig>(configs);
});
