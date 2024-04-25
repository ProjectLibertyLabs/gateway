import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { PublishHandleRequest } from './handles.request.dto';
import { PublishSIWFSignupRequest } from './wallet.login.request.dto';
import { PublishKeysRequest } from './keys.request.dto';

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
