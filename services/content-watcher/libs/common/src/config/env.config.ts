import Joi from 'joi';
import { ConfigModuleOptions } from '@nestjs/config';
import { EnvironmentDto } from '..';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema: Joi.object({
    ENVIRONMENT: Joi.string()
      .valid(...Object.values(EnvironmentDto))
      .required(),
    IPFS_ENDPOINT: Joi.string().uri().required(),
    IPFS_GATEWAY_URL: Joi.string().required(), // This is parse as string as the required format of this not a valid uri, check .env.template
    IPFS_BASIC_AUTH_USER: Joi.string().allow('').default(''),
    IPFS_BASIC_AUTH_SECRET: Joi.string().allow('').default(''),
    REDIS_URL: Joi.string().uri().required(),
    FREQUENCY_URL: Joi.string().uri().required(),
    STARTING_BLOCK: Joi.string().default('0'),
    BLOCKCHAIN_SCAN_INTERVAL_MINUTES: Joi.number()
      .min(1)
      .default(3 * 60),
    QUEUE_HIGH_WATER: Joi.number().min(100).default(1000),
    HEALTH_CHECK_SUCCESS_THRESHOLD: Joi.number().min(1).default(10),
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: Joi.number().min(1).default(64),
    HEALTH_CHECK_MAX_RETRIES: Joi.number().min(0).default(20),
    WEB_HOOK_POST_MAX_RETRIES: Joi.number().min(0).default(3),
    API_PORT: Joi.number().min(0).default(3000),
  }),
};
