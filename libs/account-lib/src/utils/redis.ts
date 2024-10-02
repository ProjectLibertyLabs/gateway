export namespace RedisUtils {
  /**
   * 45 days upper limit to avoid keeping abandoned data forever
   */
  export const STORAGE_EXPIRE_UPPER_LIMIT_SECONDS = 45 * 24 * 60 * 60;
  /**
   * batch Lock expire time which applies during closing operation
   */
  export const BATCH_LOCK_EXPIRE_SECONDS = 6;

  /**
   * Hash set key containing ITxStatus values for submitted chain transactions we are watching for completion
   */
  export const TXN_WATCH_LIST_KEY = 'txnWatchList';
}
