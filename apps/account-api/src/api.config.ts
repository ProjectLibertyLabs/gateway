import { JoiUtils } from '#config';
import { EnvironmentType } from '@projectlibertylabs/graph-sdk';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IAccountApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
  siwfNodeRpcUrl: URL;
  graphEnvironmentType: keyof EnvironmentType;
  siwfUrl: string;
  siwfV2Url?: string;
  siwfV2URIValidation?: string;
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
    siwfNodeRpcUrl: {
      value: process.env.SIWF_NODE_RPC_URL,
      joi: Joi.string().uri().required(),
    },
    graphEnvironmentType: {
      value: process.env.GRAPH_ENVIRONMENT_TYPE,
      joi: Joi.string().required().valid('Mainnet', 'TestnetPaseo'),
    },
    siwfUrl: {
      value: process.env.SIWF_URL,
      joi: Joi.string().uri().default('https://ProjectLibertyLabs.github.io/siwf/v1/ui'),
    },
    siwfV2Url: {
      value: process.env.SIWF_V2_URL,
      joi: Joi.string().optional().allow(null).allow('').empty('').uri(),
    },
    siwfV2URIValidation: {
      value: process.env.SIWF_V2_URI_VALIDATION,
      // Allow localhost specifically
      joi: Joi.string().optional().allow(null).allow('localhost').allow('').empty('').uri(),
    },
  };

  return JoiUtils.validate<IAccountApiConfig>(configs);
});
