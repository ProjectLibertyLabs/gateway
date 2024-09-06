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

export function getNonceKey(suffix: string) {
  return `${CHAIN_NONCE_KEY}:${suffix}`;
}

/**
 * Prefix for Redis keys that store webhook endpoints
 */
export const REDIS_WEBHOOK_PREFIX = 'graph-service-webhooks';

/**
 * Const for registering/looking up webhooks designated for all MSAs
 */
export const REDIS_WEBHOOK_ALL = 'all';
