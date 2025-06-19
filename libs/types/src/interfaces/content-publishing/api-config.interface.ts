export interface IContentPublishingApiConfig {
  apiBodyJsonLimit: string;
  apiPort: number;
  apiTimeoutMs: number;
  // NOTE: fileUploadMaxSizeBytes is to be removed once the `v1/asset/upload` endpoint is removed in favor of the v2 streaming endpoint
  fileUploadMaxSizeBytes: number;
  fileUploadCountLimit: number;
  providerId: bigint;
}
