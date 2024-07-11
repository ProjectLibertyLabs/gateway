import Joi from 'joi';
import { ConfigModuleOptions } from '@nestjs/config';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema: Joi.object({
    IPFS_ENDPOINT: Joi.string().uri().required(),
    IPFS_GATEWAY_URL: Joi.string().required(), // This is parse as string as the required format of this not a valid uri, check .env.template
    IPFS_BASIC_AUTH_USER: Joi.string().allow('').default(''),
    IPFS_BASIC_AUTH_SECRET: Joi.string().allow('').default(''),
    REDIS_URL: Joi.string().uri().required(),
    FREQUENCY_URL: Joi.string().uri().required(),
    STARTING_BLOCK: Joi.number().min(1),
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: Joi.number()
      .min(1)
      .default(12),
    QUEUE_HIGH_WATER: Joi.number().min(100).default(1000),
    WEBHOOK_FAILURE_THRESHOLD: Joi.number().min(0).default(3),
    WEBHOOK_RETRY_INTERVAL_SECONDS: Joi.number().min(1).default(10),
    API_PORT: Joi.number().min(0).default(3000),
  }),
};
