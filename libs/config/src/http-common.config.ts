import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IHttpCommonConfig {
  httpResponseTimeoutMS: number;
}

export default registerAs('http-common', (): IHttpCommonConfig => {
  const configs: JoiUtils.JoiConfig<IHttpCommonConfig> = JoiUtils.normalizeConfigNames({
    httpResponseTimeoutMS: {
      label: 'HTTP_RESPONSE_TIMEOUT_MS',
      joi: Joi.number().min(0).default(3000),
    },
  });

  return JoiUtils.validate<IHttpCommonConfig>(configs);
});
