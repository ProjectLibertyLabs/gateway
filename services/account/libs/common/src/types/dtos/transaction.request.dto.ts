import { BlockHash } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { PublishHandleRequestDto } from './handles.request.dto';
import { PublishSIWFSignupRequestDto } from './wallet.login.request.dto';
import { PublishKeysRequestDto } from './keys.request.dto';
import { GraphKeysRequestDto } from "#lib/types/dtos/graphs.request.dto";

export type TransactionData<
  RequestType = PublishHandleRequestDto | PublishSIWFSignupRequestDto | PublishKeysRequestDto | GraphKeysRequestDto,
> = RequestType & {
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
  transactionType: PublishHandleRequestDto['type'];
}
export interface SIWFWebhookRsp extends TxWebhookRspBase, SIWFOpts {
  transactionType: PublishSIWFSignupRequestDto['type'];
}
export interface PublishKeysWebhookRsp extends TxWebhookRspBase, PublishKeysOpts {
  transactionType: PublishKeysRequestDto['type'];
}
export type TxWebhookRsp = PublishHandleWebhookRsp | SIWFWebhookRsp | PublishKeysWebhookRsp;
