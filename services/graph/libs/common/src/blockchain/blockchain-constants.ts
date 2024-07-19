interface IExtrinsicCall {
  pallet: string;
  extrinsic: string;
}

interface IChainEvent {
  eventPallet: string;
  event: string;
}

interface IChainQuery {
  queryPallet: string;
  query: string;
}

interface IChainRpc {
  rpcPallet: string;
  rpc: string;
}
const PALLET_FREQ_TX_PYMT = 'frequencyTxPayment';
const PALLET_STATEFUL_STORAGE = 'statefulStorage';

const EX_PAY_CAPACITY_BATCH = 'payWithCapacityBatchAll';
const EX_UPSERT_PAGE = 'upsertPage';

const PAY_WITH_CAPACITY_BATCH: IExtrinsicCall = { pallet: PALLET_FREQ_TX_PYMT, extrinsic: EX_PAY_CAPACITY_BATCH };

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
