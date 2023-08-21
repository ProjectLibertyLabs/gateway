import Joi from 'joi';
import { ConfigModuleOptions } from '@nestjs/config';
import { mnemonicValidate } from '@polkadot/util-crypto';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema: Joi.object({
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
    PROVIDER_BASE_URL: Joi.string().uri().required(),
    PROVIDER_ACCESS_TOKEN: Joi.string(),
    BLOCKCHAIN_SCAN_INTERVAL_MINUTES: Joi.number()
      .min(1)
      .default(3 * 60),
    QUEUE_HIGH_WATER: Joi.number().min(100).default(1000),
    PROVIDER_ACCOUNT_SEED_PHRASE: Joi.string()
      .required()
      .custom((value: string, helpers) => {
        if (!mnemonicValidate(value)) {
          return helpers.error('any.invalid');
        }
        return value;
      }),
    WEBHOOK_FAILURE_THRESHOLD: Joi.number().min(1).default(3),
    WEBHOOK_RETRY_INTERVAL_SECONDS: Joi.number().min(1).default(10),
    HEALTH_CHECK_SUCCESS_THRESHOLD: Joi.number().min(1).default(10),
    HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: Joi.number().min(1).default(64),
    HEALTH_CHECK_MAX_RETRIES: Joi.number().min(0).default(20),
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
