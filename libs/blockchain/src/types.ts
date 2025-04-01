/* eslint-disable max-classes-per-file */
/*
 * NOTE: This class is designed to isolate consumers from having to deal with the details of interacting directly
 *       with the Frequency blockchain. To that end, return values of functions should not expose the SCALE-
 *       encoded objects that are directly returned from Frequency RPC calls; rather, all payloads should be
 *       unwrapped and re-formed using native Javascript types.
 *
 *       RPC methods that have the potential to return values wrapped as `Option<...>` or any value supporting
 *       the `.isEmpty`, `.isSome`, or `.isNone` getters should implement one of the following behaviors:
 *          - have a specified return type of `<type> | null` and return null for an empty value
 *          - return some sane default for an empty value
 *          - throw an error if an empty value is encountered
 */

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

export class RpcError extends Error {}
export class NonceConflictError extends RpcError {}
export class BadSignatureError extends RpcError {}
export class InsufficientBalanceError extends RpcError {}
export class MortalityError extends RpcError {}
