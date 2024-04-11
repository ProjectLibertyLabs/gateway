export namespace QueueConstants {
  /**
   * Name of the queue that publishes account transactions to Frequency blockchain
   */
  export const TRANSACTION_PUBLISH_QUEUE = 'transactionPublish';

  /**
   * Name of the queue that processes account transaction notifications
   */
  export const TRANSACTION_NOTIFY_QUEUE = 'transactionNotify';

  /**
   * Prefix for Redis keys that store webhook endpoints
   */
  export const REDIS_WATCHER_PREFIX = 'account-service-watcher';

  /**
   * Debouncer cache key
   */
  export const DEBOUNCER_CACHE_KEY = 'account-service-debouncer';

  /**
   * Last processed msaId key for Redis
   * @type {string}
   */
  export const LAST_PROCESSED_DSNP_ID_KEY: string = 'lastProcessedMsaId';
}
