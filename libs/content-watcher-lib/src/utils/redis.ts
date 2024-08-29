/**
 * 45 days upper limit to avoid keeping abandoned data forever
 */
export const STORAGE_EXPIRE_UPPER_LIMIT_SECONDS = 45 * 24 * 60 * 60;
/**
 * batch Lock expire time which applies during closing operation
 */
export const BATCH_LOCK_EXPIRE_SECONDS = 6;
/**
 * To be able to provide mostly unique nonces to submit transactions on chain we would need to check a number of
 * temporarily locked keys on redis side and get the first available one. This number defines the number of keys
 * we should look into before giving up
 */
export const NUMBER_OF_NONCE_KEYS_TO_CHECK = 50;
/**
 * Nonce keys have to get expired shortly so that if any of nonce numbers get skipped we would still have a way to
 * submit them after expiration
 */
export const NONCE_KEY_EXPIRE_SECONDS = 2;
const CHAIN_NONCE_KEY = 'chain:nonce';
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
export function getNonceKey(suffix: string) {
  return `${CHAIN_NONCE_KEY}:${suffix}`;
}
