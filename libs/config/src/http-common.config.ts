import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IHttpCommonConfig {
  httpResponseTimeoutMS: number;
}

export default registerAs('http-common', (): IHttpCommonConfig => {
  // Get API_TIMEOUT_MS from environment or use default
  const apiTimeoutMs = parseInt(process.env.API_TIMEOUT_MS || '30000', 10);

  const configs: JoiUtils.JoiConfig<IHttpCommonConfig> = JoiUtils.normalizeConfigNames({
    httpResponseTimeoutMS: {
      label: 'HTTP_RESPONSE_TIMEOUT_MS',
      joi: Joi.number()
        .min(0)
        .max(apiTimeoutMs - 1) // Must be less than API_TIMEOUT_MS
        .default(3000)
        .custom((value, helpers) => {
          if (value >= apiTimeoutMs) {
            return helpers.error('any.custom', {
              message: `HTTP_RESPONSE_TIMEOUT_MS (${value}) must be less than API_TIMEOUT_MS (${apiTimeoutMs})`,
            });
          }
          return value;
        }),
    },
  });

  return JoiUtils.validate<IHttpCommonConfig>(configs);
});
