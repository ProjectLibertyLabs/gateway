import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { PublishHandleRequest } from './handles.dtos';

// TODO: Create an | for any other publisher requests that we add.
export type TransactionData = PublishHandleRequest & {
  providerId: string;
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

export enum TransactionType {
  CHANGE_HANDLE = 'CHANGE_HANDLE',
  CREATE_HANDLE = 'CREATE_HANDLE',
  CREATE_ACCOUNT = 'CREATE_ACCOUNT',
}

type Update = {
  type: TransactionType;
  providerId: string;
  payload: Uint8Array;
};

export class TransactionNotification {
  msaId: string;
  update: Update;
}
