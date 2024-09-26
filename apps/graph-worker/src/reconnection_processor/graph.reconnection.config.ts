import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IGraphReconnectionConfig {
  pageSize: number;
}

export default registerAs('reconnection', (): IGraphReconnectionConfig => {
  const configs: JoiUtils.JoiConfig<IGraphReconnectionConfig> = {
    pageSize: {
      value: process.env.CONNECTIONS_PER_PROVIDER_RESPONSE_PAGE,
      joi: Joi.number().min(1).default(100),
    },
  };

  return JoiUtils.validate<IGraphReconnectionConfig>(configs);
});
