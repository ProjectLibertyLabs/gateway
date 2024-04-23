/* eslint-disable max-classes-per-file */
import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { PublishHandleRequest } from './handles.dto';
import { PublishSIWFSignupRequest } from './wallet.login.request.dto';

export type TransactionData<RequestType = PublishHandleRequest | PublishSIWFSignupRequest> = RequestType & {
  providerId: number;
  referenceId: string;
};

export type TxMonitorJob = TransactionData & {
  id: string;
  txHash: Hash;
  epoch: string;
  lastFinalizedBlockHash: BlockHash;
};

export class TransactionResponse {
  referenceId: string;
}

export class TransactionNotification {
  msaId: number;

  data: TxMonitorJob;
}
