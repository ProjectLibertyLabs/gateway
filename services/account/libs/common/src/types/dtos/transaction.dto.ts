/* eslint-disable max-classes-per-file */
import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { PublishHandleRequest } from './handles.dto';
import { PublishSIWFSignupRequest } from './wallet.login.request.dto';
import { PublishKeysRequest } from './keys.dto';

export type TransactionData<RequestType = PublishHandleRequest | PublishSIWFSignupRequest | PublishKeysRequest> =
  RequestType & {
    providerId: number;
    referenceId: string;
  };

export type TxMonitorJob = TransactionData & {
  id: string;
  txHash: Hash;
  epoch: string;
  lastFinalizedBlockHash: BlockHash;
};

export type TransactionResponse = {
  referenceId: string;
};

export class TransactionNotification {
  msaId: number;

  data: TxMonitorJob;
}
