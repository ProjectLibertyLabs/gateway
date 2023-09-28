export namespace RedisUtils {
  /**
   * 45 days upper limit to avoid keeping abandoned data forever
   */
  export const STORAGE_EXPIRE_UPPER_LIMIT_SECONDS = 45 * 24 * 60 * 60;
  /**
   * batch Lock expire time which applies during closing operation
   */
  export const BATCH_LOCK_EXPIRE_SECONDS = 6;
  const ASSET_DATA_KEY_PREFIX = 'asset:data';
  const ASSET_METADATA_KEY_PREFIX = 'asset:metadata';
  const BATCH_DATA_KEY_PREFIX = 'batch:data';
  const BATCH_METADATA_KEY_PREFIX = 'batch:metadata';
  const LOCK_KEY_PREFIX = 'locked';

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

  export function getLockKey(suffix: string) {
    return `${LOCK_KEY_PREFIX}:${suffix}`;
  }
}
