import { JoiUtils } from '#config';
import { EnvironmentType } from '@dsnp/graph-sdk';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IAccountApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
  frequencyHttpUrl: URL;
  graphEnvironmentType: keyof EnvironmentType;
  siwfUrl: string;
}

export default registerAs('account-api', (): IAccountApiConfig => {
  const configs: JoiUtils.JoiConfig<IAccountApiConfig> = {
    apiBodyJsonLimit: {
      value: process.env.API_BODY_JSON_LIMIT,
      joi: Joi.string().default('1mb'),
    },
    apiPort: {
      value: process.env.API_PORT,
      joi: Joi.number().min(0).default(3000),
    },
    apiTimeoutMs: {
      value: process.env.API_TIMEOUT_MS,
      joi: Joi.number().min(1).default(5000),
    },
    frequencyHttpUrl: {
      value: process.env.FREQUENCY_HTTP_URL,
      joi: Joi.string().uri().required(),
    },
    graphEnvironmentType: {
      value: process.env.GRAPH_ENVIRONMENT_TYPE,
      joi: Joi.string().required().valid('Mainnet', 'TestnetPaseo'),
    },
    siwfUrl: {
      value: process.env.SIWF_URL,
      joi: Joi.string().uri().default('https://ProjectLibertyLabs.github.io/siwf/ui'),
    },
  };

  return JoiUtils.validate<IAccountApiConfig>(configs);
});
