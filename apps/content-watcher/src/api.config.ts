import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IContentWatcherApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
}

export default registerAs('content-watcher-api', (): IContentWatcherApiConfig => {
  const configs: JoiUtils.JoiConfig<IContentWatcherApiConfig> = {
    apiBodyJsonLimit: {
      value: process.env.API_BODY_JSON_LIMIT,
      joi: Joi.string().default('1mb'),
    },
    apiPort: {
      value: process.env.API_PORT,
      joi: Joi.number().min(0).default(3000),
    },
    apiTimeoutMs: {
      value: process.env.API_TIMEOUT_MS,
      joi: Joi.number().min(1).default(5000),
    },
  };

  return JoiUtils.validate<IContentWatcherApiConfig>(configs);
});
