import { HexString } from '@polkadot/util/types';
import { ProviderGraphUpdateJob } from './graph';
import { TransactionType } from '#types/tx-notification-webhook';

/**
 * Interface representing the base status information for a parachain (Frequency) transaction.
 *
 * This interface defines the fundamental properties that describe the lifecycle and
 * identity of a transaction, including its type, hash, success indicators, and temporal
 * boundaries. It serves as a foundation for tracking transaction states across different
 * stages of processing.
 *
 * The interface captures both the transaction's unique identifier and its lifecycle events,
 * allowing systems to monitor when a transaction was created and when it reached its final
 * state. The optional success event provides additional context about the outcome of the
 * transaction execution.
 *
 * @interface IBaseTxStatus
 */
export interface IBaseTxStatus {
  type: TransactionType;
  txHash: HexString;
  referenceId?: string;
  providerId?: string;

  successEvent?: {
    section: string;

    method: string;
  };

  birth: number;

  death: number;
}

export interface IGraphTxStatus extends IBaseTxStatus {
  referenceJob: ProviderGraphUpdateJob;
}
