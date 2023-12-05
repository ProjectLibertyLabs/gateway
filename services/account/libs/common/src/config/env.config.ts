import Joi from 'joi';
import { ConfigModuleOptions } from '@nestjs/config';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema: Joi.object({
    REDIS_URL: Joi.string().uri().required(),
    FREQUENCY_URL: Joi.string().uri().required(),
    QUEUE_HIGH_WATER: Joi.number().min(100).default(1000),
    API_PORT: Joi.number().min(0).default(3000),
    GRAPH_ENVIRONMENT_TYPE: Joi.string().required().valid('Mainnet', 'Rococo', 'Dev'),
    // GRAPH_ENVIRONMENT_DEV_CONFIG is optional, but if it is set, it must be a valid JSON string
    GRAPH_ENVIRONMENT_DEV_CONFIG: Joi.string().when('GRAPH_ENVIRONMENT_TYPE', {
      is: 'Dev',
      then: Joi.string()
        .required()
        .custom((value: string, helpers) => {
          try {
            JSON.parse(value);
          } catch (e) {
            return helpers.error('any.invalid');
          }
          return value;
        }),
    }),
  }),
};
