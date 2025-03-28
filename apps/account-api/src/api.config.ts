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
  siwfV2URIValidation?: string[];
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
      joi: Joi.custom((value, helpers) => {
        if (value === undefined || value === '') {
          return undefined; // treat unset/empty as undefined
        }

        const uriSchema = Joi.string().uri().allow('localhost');

        // Try parsing as JSON array
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);

            if (Array.isArray(parsed)) {
              const { error, value: validatedArray } = Joi.array().items(uriSchema).validate(parsed);
              if (error || !validatedArray.length) {
                return helpers.error('any.invalid', { message: error.message });
              }
              return validatedArray;
            }
          } catch {
            // not JSON, fall through
          }

          // Validate as single URI
          const { error } = uriSchema.validate(value);
          if (error) {
            return helpers.error('any.invalid', { message: error.message });
          }

          return [value];
        }

        return helpers.error('any.invalid');
      })
        .messages({
          'any.invalid':
            'Must be a URI string or a JSON array of URI strings (allowing "localhost", excluding empty strings inside arrays)',
        })
        .optional(),
    },
  };

  return JoiUtils.validate<IAccountApiConfig>(configs);
});
