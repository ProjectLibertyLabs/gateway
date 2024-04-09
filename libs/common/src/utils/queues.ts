export namespace QueueConstants {
  /**
   * Name of the queue that publishes account changes to Frequency blockchain
   */
  export const ACCOUNT_CHANGE_PUBLISH_QUEUE = 'accountChangePublish';

  /**
   * Name of the queue that processes account change notifications
   */
  export const ACCOUNT_CHANGE_NOTIFY_QUEUE = 'accountChangeNotify';

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
