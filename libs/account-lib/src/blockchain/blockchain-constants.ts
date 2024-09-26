export namespace BlockchainConstants {
  export const SECONDS_PER_BLOCK = 12;

  /**
   * The number of blocks to crawl for a given job
   * @type {number}
   * @memberof BlockchainConstants
   * @static
   * @readonly
   * @public
   * @constant
   * @description
   * The number of blocks to crawl for a given job
   */
  export const NUMBER_BLOCKS_TO_CRAWL = 32n; // TODO: take from tx, keeping it constant to default tx mortality
}
