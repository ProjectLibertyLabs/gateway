/* eslint-disable no-redeclare */

import {
  PublishHandleOpts,
  PublishHandleWebhookRsp,
  SIWFOpts,
  SIWFWebhookRsp,
  PublishKeysOpts,
  PublishKeysWebhookRsp,
  TxWebhookOpts,
} from '#types/dtos/account';
import { IAccountTxStatus } from '#types/interfaces';

export function createWebhookRsp(
  txStatus: IAccountTxStatus,
  msaId: string,
  options: PublishHandleOpts,
): PublishHandleWebhookRsp;
export function createWebhookRsp(txStatus: IAccountTxStatus, msaId: string, options: SIWFOpts): SIWFWebhookRsp;
export function createWebhookRsp(
  txStatus: IAccountTxStatus,
  msaId: string,
  options: PublishKeysOpts,
): PublishKeysWebhookRsp;
export function createWebhookRsp(
  { type: transactionType, providerId, referenceId }: IAccountTxStatus,
  msaId: string,
  options: TxWebhookOpts,
): unknown {
  return {
    transactionType,
    providerId,
    referenceId,
    msaId,
    ...options,
  };
}
