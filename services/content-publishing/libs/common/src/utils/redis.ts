export namespace RedisUtils {
  const ASSET_DATA_KEY_PREFIX = 'asset::data';
  const ASSET_METADATA_KEY_PREFIX = 'asset::metadata';

  export function getAssetDataKey(assetId: string) {
    return `${ASSET_DATA_KEY_PREFIX}:${assetId}`;
  }

  export function getAssetMetadataKey(assetId: string) {
    return `${ASSET_METADATA_KEY_PREFIX}:${assetId}`;
  }
}
