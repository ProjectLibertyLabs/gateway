import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IGraphApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
}

export default registerAs('graph-api', (): IGraphApiConfig => {
  const configs: JoiUtils.JoiConfig<IGraphApiConfig> = JoiUtils.normalizeConfigNames({
    apiBodyJsonLimit: {
      label: 'API_BODY_JSON_LIMIT',
      joi: Joi.string().default('1mb'),
    },
    apiPort: {
      label: 'API_PORT',
      joi: Joi.number().min(0).default(3000),
    },
    apiTimeoutMs: {
      label: 'API_TIMEOUT_MS',
      joi: Joi.number().min(1).default(30000),
    },
  });

  return JoiUtils.validate<IGraphApiConfig>(configs);
});
