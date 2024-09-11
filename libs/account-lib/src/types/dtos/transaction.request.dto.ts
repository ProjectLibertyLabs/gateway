import { BlockHash } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { PublicKeyAgreementRequestDto, PublishPublicKeyAgreementRequestDto } from './graphs.request.dto';
import { PublishHandleRequestDto } from './handles.request.dto';
import { PublishSIWFSignupRequestDto } from './wallet.login.request.dto';
import { PublishKeysRequestDto } from './keys.request.dto';
import { PublishRetireMsaRequestDto } from '#account-lib/types/dtos/accounts.request.dto';

export type TransactionData<
  RequestType =
    | PublishHandleRequestDto
    | PublishSIWFSignupRequestDto
    | PublishKeysRequestDto
    | PublishRetireMsaRequestDto
    | PublicKeyAgreementRequestDto,
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
export type PublishGraphKeysOpts = { schemaId: string };
export type TxWebhookOpts = PublishHandleOpts | SIWFOpts | PublishKeysOpts | PublishGraphKeysOpts;

export interface PublishHandleWebhookRsp extends TxWebhookRspBase, PublishHandleOpts {
  transactionType: PublishHandleRequestDto['type'];
}
export interface SIWFWebhookRsp extends TxWebhookRspBase, SIWFOpts {
  transactionType: PublishSIWFSignupRequestDto['type'];
}
export interface PublishKeysWebhookRsp extends TxWebhookRspBase, PublishKeysOpts {
  transactionType: PublishKeysRequestDto['type'];
}
export interface PublishGraphKeysWebhookRsp extends TxWebhookRspBase, PublishGraphKeysOpts {
  transactionType: PublishPublicKeyAgreementRequestDto['type'];
}
export type TxWebhookRsp =
  | PublishHandleWebhookRsp
  | SIWFWebhookRsp
  | PublishKeysWebhookRsp
  | PublishGraphKeysWebhookRsp;
