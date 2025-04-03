import { JoiUtils } from '#config';
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

export interface IContentPublishingApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
  // NOTE: fileUploadMaxSizeBytes is to be removed once the `v1/asset/upload` endpoint is removed in favor of the v2 streaming endpoint
  fileUploadMaxSizeBytes: number;
  fileUploadCountLimit: number;
  providerId: bigint;
}

export default registerAs('content-publishing-api', (): IContentPublishingApiConfig => {
  const configs: JoiUtils.JoiConfig<IContentPublishingApiConfig> = JoiUtils.normalizeConfigNames({
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
      // uploading files requires us to have a larger default value
      joi: Joi.number().min(1).default(30000),
    },
    fileUploadMaxSizeBytes: {
      label: 'FILE_UPLOAD_MAX_SIZE_IN_BYTES',
      joi: Joi.number().min(1).required(),
    },
    fileUploadCountLimit: {
      label: 'FILE_UPLOAD_COUNT_LIMIT',
      joi: Joi.number().min(1).required(),
    },
    providerId: {
      label: 'PROVIDER_ID',
      joi: JoiUtils.bigintSchema().required(),
    },
  });

  return JoiUtils.validate<IContentPublishingApiConfig>(configs);
});
