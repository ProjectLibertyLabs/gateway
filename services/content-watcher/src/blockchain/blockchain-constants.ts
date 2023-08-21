export namespace BlockchainConstants {
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
}
