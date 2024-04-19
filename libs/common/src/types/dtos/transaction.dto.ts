/* eslint-disable max-classes-per-file */
import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { PublishHandleRequest } from './handles.dto';
import { SIWFSignupRequest } from './wallet.login.response.dto';

export type TransactionData<RequestType = PublishHandleRequest | SIWFSignupRequest> = RequestType & {
  providerId: number;
  referenceId: string;
};

export type TxMonitorJob = TransactionData & {
  id: string;
  txHash: Hash;
  epoch: string;
  lastFinalizedBlockHash: BlockHash;
};

export class TransactionRepsonse {
  referenceId: string;
}

export class TransactionNotification {
  msaId: number;

  data: TxMonitorJob;
}
