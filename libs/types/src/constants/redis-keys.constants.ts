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
