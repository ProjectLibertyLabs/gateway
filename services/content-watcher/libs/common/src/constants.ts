/**
 * Number of seconds to create a block in Frequency chain
 */
export const SECONDS_PER_BLOCK = 12;
/**
 * Name of timeout event used for in memory scheduler
 */
export const CAPACITY_EPOCH_TIMEOUT_NAME = 'capacity-epoch-timeout';

/**
 * Last seen block number key for Redis
 * @type {string}
 */
export const LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY = 'lastSeenBlockNumberScanner';

/**
 * Filters and Events to watch key for Redis
 * @type {string}
 */
export const EVENTS_TO_WATCH_KEY = 'eventsToWatch';

/**
 * Registered Webhook key for Redis
 * @type {string}
 */
export const REGISTERED_WEBHOOK_KEY = 'registeredWebhook';
