/**
 * Name of the queue that has all reconnecting requests
 */
export const RECONNECT_REQUEST_QUEUE = 'reconnectRequest';

/**
 * Name of the queue that has all incoming requests
 */
export const GRAPH_CHANGE_REQUEST_QUEUE = 'graphChangeRequest';

/**
 * Name of the queue that publishes graph changes to Frequency blockchain
 */
export const GRAPH_CHANGE_PUBLISH_QUEUE = 'graphChangePublish';

/**
 * Debouncer cache key
 */
export const DEBOUNCER_CACHE_KEY = 'graph-service-debouncer';

/**
 * Last processed dsnpId key for Redis
 */
export const LAST_PROCESSED_DSNP_ID_KEY = 'lastProcessedDsnpId';
