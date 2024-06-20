import Joi from 'joi';
import { ConfigModuleOptions } from '@nestjs/config';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema: Joi.object({
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
          const schema = Joi.object({
            type: Joi.string()
              .required()
              .pattern(/^(percentage|amount)$/),
            value: Joi.alternatives()
              .conditional('type', {
                is: 'percentage',
                then: Joi.number().min(0).max(100),
                otherwise: Joi.number().min(0),
              })
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
