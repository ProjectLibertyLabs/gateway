import { BlockHash } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { PublishHandleRequest } from './handles.request.dto';
import { PublishSIWFSignupRequest } from './wallet.login.request.dto';
import { PublishKeysRequest } from './keys.request.dto';

export type TransactionData<RequestType = PublishHandleRequest | PublishSIWFSignupRequest | PublishKeysRequest> =
  RequestType & {
    providerId: string;
    referenceId: string;
  };

export type TxMonitorJob = TransactionData & {
  id: string;
  txHash: HexString;
  epoch: number;
  lastFinalizedBlockHash: BlockHash;
};

export type TxWebhookRspBase = {
  providerId: TransactionData['providerId'];
  referenceId: TransactionData['referenceId'];
  msaId: string;
};

export type PublishHandleOpts = { handle: string };
export type SIWFOpts = { handle: string; accountId: string };
export type PublishKeysOpts = { newPublicKey: string };
export type TxWebhookOpts = PublishHandleOpts | SIWFOpts | PublishKeysOpts;

export interface PublishHandleWebhookRsp extends TxWebhookRspBase, PublishHandleOpts {
  transactionType: PublishHandleRequest['type'];
}
export interface SIWFWebhookRsp extends TxWebhookRspBase, SIWFOpts {
  transactionType: PublishSIWFSignupRequest['type'];
}
export interface PublishKeysWebhookRsp extends TxWebhookRspBase, PublishKeysOpts {
  transactionType: PublishKeysRequest['type'];
}
export type TxWebhookRsp = PublishHandleWebhookRsp | SIWFWebhookRsp | PublishKeysWebhookRsp;
