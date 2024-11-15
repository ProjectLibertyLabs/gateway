/**
 * Matching interfaces for blockchain return types.
 * To limit the scope of polkadot-js types and dependencies, we define our own interfaces here.
 * */

export interface SIWFTxnValues {
  msaId: string;
  address: string;
  handle: string;
  newProvider: string;
}

export interface ICapacityInfo {
  providerId: string;
  currentBlockNumber: number;
  nextEpochStart: number;
  remainingCapacity: bigint;
  totalCapacityIssued: bigint;
  currentEpoch: number;
}

export interface ICapacityFeeDetails {
  inclusionFee: {
    baseFee: bigint;
    lenFee: bigint;
    adjustedWeightFee: bigint;
  };
}
