import Joi from 'joi';
import { ConfigModuleOptions } from '@nestjs/config';
import { ValidationError } from 'class-validator';

const bigintSchema = Joi.custom((value) => {
  const strResult = Joi.string().validate(value);
  if (strResult.error) {
    throw strResult.error;
  }

  const numResult = Joi.number().unsafe().positive().validate(value);
  if (numResult.error) {
    throw numResult.error;
  }

  return BigInt(value);
});

const capacityLimitSchema = Joi.object({
  type: Joi.any().valid('percentage', 'amount').required(),
  value: Joi.any().when('type', { is: 'percentage', then: Joi.number().positive().max(100), otherwise: bigintSchema }),
});

const capacityLimitsSchema = Joi.object({
  serviceLimit: capacityLimitSchema.required(),
  totalLimit: capacityLimitSchema,
});

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema: Joi.object({
    CACHE_KEY_PREFIX: Joi.string().default('account:'),
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: Joi.number().min(1).default(12),
    TRUST_UNFINALIZED_BLOCKS: Joi.bool().default(false),
    REDIS_URL: Joi.string().uri().required(),
    FREQUENCY_URL: Joi.string().uri().required(),
    FREQUENCY_HTTP_URL: Joi.string().uri().required(),
    API_PORT: Joi.number().min(0).default(3000),
    PROVIDER_ACCOUNT_SEED_PHRASE: Joi.string().required(),
    PROVIDER_ID: Joi.required().custom((value: string, helpers) => {
      try {
        const id = BigInt(value);
        if (id < 0n) {
          throw new Error('Provider ID must be > 0');
        }
      } catch (e) {
        return helpers.error('any.invalid');
      }
      return value;
    }),
    PROVIDER_BASE_URL: Joi.string().uri().required(),
    PROVIDER_ACCESS_TOKEN: Joi.string().default(''),
    WEBHOOK_FAILURE_THRESHOLD: Joi.number().min(1).default(3),
    WEBHOOK_RETRY_INTERVAL_SECONDS: Joi.number().min(1).default(10),
    HEALTH_CHECK_SUCCESS_THRESHOLD: Joi.number().min(1).default(10),
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: Joi.number().min(1).default(64),
    HEALTH_CHECK_MAX_RETRIES: Joi.number().min(0).default(20),
    CAPACITY_LIMIT: Joi.string()
      .custom((value: string, helpers) => {
        try {
          const obj = JSON.parse(value);

          const result1 = capacityLimitSchema.validate(obj);
          const result2 = capacityLimitsSchema.validate(obj);

          if (obj?.type && result1.error) {
            return helpers.error('any.custom', { error: result1.error });
          }

          if (obj?.serviceLimit && result2.error) {
            throw result2.error;
          }

          if (result1.error && result2.error) {
            return helpers.error('any.custom', {
              error: new Error('JSON object does not conform to the required structure'),
            });
          }
        } catch (e) {
          if (e instanceof ValidationError) {
            throw e;
          }

          return helpers.error('any.custom', { error: e });
        }

        return value;
      })
      .required(),
  }),
};
