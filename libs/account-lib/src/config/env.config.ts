import Joi from 'joi';
import { ConfigModuleOptions, registerAs } from '@nestjs/config';

export const configModuleOptions = (allowReadOnly: boolean): ConfigModuleOptions => ({
  isGlobal: true,
  validationSchema: Joi.object({
    API_BODY_JSON_LIMIT: Joi.string().default('1mb'),
    API_PORT: Joi.number().min(0).default(3000),
    API_TIMEOUT_MS: Joi.number().min(1).default(5000),
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: Joi.number().min(1).default(12),
    FREQUENCY_HTTP_URL: Joi.string().uri().required(),
    GRAPH_ENVIRONMENT_TYPE: Joi.string().required().valid('Mainnet', 'TestnetPaseo'),
  }),
});
