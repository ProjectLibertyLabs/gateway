import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IContentPublishingApiConfig {
  // apiBodyJsonLimit: string;
  apiPort: number;
  // apiTimeoutMs: number;
  fileUploadMaxSizeBytes: number;
  fileUploadCountLimit: number;
}

export default registerAs('content-publishing-api', (): IContentPublishingApiConfig => {
  const configs: JoiUtils.JoiConfig<IContentPublishingApiConfig> = {
    // apiBodyJsonLimit: {
    //   value: process.env.API_BODY_JSON_LIMIT,
    //   joi: Joi.string().default('1mb'),
    // },
    apiPort: {
      value: process.env.API_PORT,
      joi: Joi.number().min(0).default(3000),
    },
    // apiTimeoutMs: {
    //   value: process.env.API_TIMEOUT_MS,
    //   joi: Joi.number().min(1).default(5000),
    // },
    fileUploadMaxSizeBytes: {
      value: process.env.FILE_UPLOAD_MAX_SIZE_IN_BYTES,
      joi: Joi.number().min(1).required(),
    },
    fileUploadCountLimit: {
      value: process.env.FILE_UPLOAD_COUNT_LIMIT,
      joi: Joi.number().min(1).required(),
    },
  };

  return JoiUtils.validate<IContentPublishingApiConfig>(configs);
});
