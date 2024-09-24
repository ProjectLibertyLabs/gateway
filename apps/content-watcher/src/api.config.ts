import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IContentWatcherApiConfig {
  apiPort: number;
}

export default registerAs('api', (): IContentWatcherApiConfig => {
  const configs: JoiUtils.JoiConfig<IContentWatcherApiConfig> = {
    apiPort: {
      value: process.env.API_PORT,
      joi: Joi.number().min(0).default(3000),
    },
  };

  return JoiUtils.validate<IContentWatcherApiConfig>(configs);
});
