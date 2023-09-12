export namespace RedisUtils {
  const ASSET_DATA_KEY_PREFIX = 'asset::data';
  const ASSET_METADATA_KEY_PREFIX = 'asset::metadata';
  const BATCH_DATA_KEY_PREFIX = 'batch::data';
  const BATCH_METADATA_KEY_PREFIX = 'batch::metadata';

  export function getAssetDataKey(assetId: string) {
    return `${ASSET_DATA_KEY_PREFIX}:${assetId}`;
  }

  export function getAssetMetadataKey(assetId: string) {
    return `${ASSET_METADATA_KEY_PREFIX}:${assetId}`;
  }

  export function getBatchDataKey(queueName: string) {
    return `${BATCH_DATA_KEY_PREFIX}:${queueName}`;
  }

  export function getBatchMetadataKey(queueName: string) {
    return `${BATCH_METADATA_KEY_PREFIX}:${queueName}`;
  }
}
