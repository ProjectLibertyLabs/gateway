/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsString, IsNumber } from 'class-validator';

export interface IContentPublishingApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
  // NOTE: fileUploadMaxSizeBytes is to be removed once the `v1/asset/upload` endpoint is removed in favor of the v2 streaming endpoint
  fileUploadMaxSizeBytes: number;
  fileUploadCountLimit: number;
  providerId: bigint;
}

export class ContentPublishingApiConfigDto implements IContentPublishingApiConfig {
  @IsString()
  apiBodyJsonLimit: string;

  @IsNumber()
  apiPort: number;

  @IsNumber()
  apiTimeoutMs: number;

  // NOTE: fileUploadMaxSizeBytes is to be removed once the `v1/asset/upload` endpoint is removed in favor of the v2 streaming endpoint
  @IsNumber()
  fileUploadMaxSizeBytes: number;

  @IsNumber()
  fileUploadCountLimit: number;

  @IsNumber()
  providerId: bigint;
}
