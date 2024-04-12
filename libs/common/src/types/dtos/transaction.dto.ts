import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { PublishHandleRequest } from './handles.dto';

export type TransactionData = PublishHandleRequest & {
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
