import Joi from 'joi';
import { ConfigModuleOptions } from '@nestjs/config';
import { ChainEnvironment } from '..';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema: Joi.object({
    CHAIN_ENVIRONMENT: Joi.string()
      .valid(...Object.values(ChainEnvironment))
      .required(),
    IPFS_ENDPOINT: Joi.string().uri().required(),
    IPFS_GATEWAY_URL: Joi.string().required(), // This is parse as string as the required format of this not a valid uri, check .env.template
    IPFS_BASIC_AUTH_USER: Joi.string().allow('').default(''),
    IPFS_BASIC_AUTH_SECRET: Joi.string().allow('').default(''),
    REDIS_URL: Joi.string().uri().required(),
    FREQUENCY_URL: Joi.string().uri().required(),
    PROVIDER_ID: Joi.required().custom((value: string, helpers) => {
      try {
        const id = BigInt(value);
        if (id < 0) {
          throw new Error('Provider ID must be > 0');
        }
      } catch (e) {
        return helpers.error('any.invalid');
      }
      return value;
    }),
    PROVIDER_ACCOUNT_SEED_PHRASE: Joi.string().required(),
    FILE_UPLOAD_MAX_SIZE_IN_BYTES: Joi.number().min(1).required(),
    API_PORT: Joi.number().min(0).default(3000),
    ASSET_EXPIRATION_INTERVAL_SECONDS: Joi.number().min(1).required(),
    BATCH_INTERVAL_SECONDS: Joi.number().min(1).required(),
    BATCH_MAX_COUNT: Joi.number().min(1).required(),
    ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: Joi.number().min(0).required(),
    CAPACITY_LIMIT: Joi.string()
      .custom((value: string, helpers) => {
        try {
          const obj = JSON.parse(value);
          const schema = Joi.object({
            type: Joi.string()
              .required()
              .pattern(/^(percentage|amount)$/),
            value: Joi.alternatives()
              .conditional('type', { is: 'percentage', then: Joi.number().min(0).max(100), otherwise: Joi.number().min(0) })
              .required(),
          });
          const result = schema.validate(obj);
          if (result.error) {
            return helpers.error('any.invalid');
          }
        } catch (e) {
          return helpers.error('any.invalid');
        }

        return value;
      })
      .required(),
  }),
};
