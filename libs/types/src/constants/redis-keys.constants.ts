/**
 *  NOTE: Each service grouping (*-api, *-watcher) prefixes its Redis keys with a service-specific
 *        prefix, so these key names, while common, will be unique per-service.
 *
 *        A notable exception is the NonceService, which has its own Redis connection with the same
 *        prefix across all services.
 */

/**
 * Last seen block number key for Redis
 * @type {string}
 */
export const LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY: string = 'lastSeenBlockNumberScanner';

/**
 * Filters and Events to watch key for Redis
 * @type {string}
 */
export const EVENTS_TO_WATCH_KEY: string = 'eventsToWatch';

/**
 * Registered Webhook key for Redis
 * @type {string}
 */
export const REGISTERED_WEBHOOK_KEY: string = 'registeredWebhook';

/**
 * Hash set key containing ITxStatus values for submitted chain transactions we are watching for completion
 */
export const TXN_WATCH_LIST_KEY = 'txnWatchList';

/**
 * Prefix for Redis keys that store webhook endpoints
 */
export const ACCOUNT_SERVICE_WATCHER_PREFIX = 'account-service-watcher';

/**
 * Debouncer cache key
 */
export const DEBOUNCER_CACHE_KEY = 'service-debouncer';

/**
 * Last processed msaId key for Redis
 * @type {string}
 */
export const LAST_PROCESSED_DSNP_ID_KEY: string = 'lastProcessedMsaId';

/**
 * 45 days upper limit to avoid keeping abandoned data forever
 */
export const STORAGE_EXPIRE_UPPER_LIMIT_SECONDS = 45 * 24 * 60 * 60;

/**
 * Prefix for Redis keys that store webhook endpoints
 */
export const REDIS_WEBHOOK_PREFIX = 'graph-service-webhooks';

/**
 * Const for registering/looking up webhooks designated for all MSAs
 */
export const REDIS_WEBHOOK_ALL = 'all';

export namespace NonceConstants {
  /**
   * To be able to provide mostly unique nonces to submit transactions on chain we would need to check a number of
   * temporarily locked keys on redis side and get the first available one. This number defines the number of keys
   * we should look into before giving up
   */
  export const NUMBER_OF_NONCE_KEYS_TO_CHECK = 200;
  /**
   * Nonce keys have to get expired shortly so that if any of nonce numbers get skipped we would still have a way to
   * submit them after expiration
   */
  export const NONCE_KEY_EXPIRE_SECONDS = 2;
  const CHAIN_NONCE_KEY = 'chain:nonce';
  export function getNonceKey(address: string, suffix: string) {
    return `${CHAIN_NONCE_KEY}:${address}:${suffix}`;
  }
}

export namespace ContentPublisherRedisConstants {
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
