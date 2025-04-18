import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IHttpCommonConfig {
  httpResponseTimeoutMS: number;
}

export default registerAs('http-common', (): IHttpCommonConfig => {
  const configs: JoiUtils.JoiConfig<IHttpCommonConfig> = {
    httpResponseTimeoutMS: {
      value: process.env.HTTP_RESPONSE_TIMEOUT_MS &&
        Math.max(Number(process.env.HTTP_RESPONSE_TIMEOUT_MS), Number(process.env.API_TIMEOUT_MS ?? 0)),
      joi: Joi.number().min(0).default(3000),
    },
  };

  return JoiUtils.validate<IHttpCommonConfig>(configs);
});
