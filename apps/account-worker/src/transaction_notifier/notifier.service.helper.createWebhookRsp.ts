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
import { ITxStatus } from '#types/interfaces';

export function createWebhookRsp(
  txStatus: ITxStatus,
  msaId: string,
  options: PublishHandleOpts,
): PublishHandleWebhookRsp;
export function createWebhookRsp(txStatus: ITxStatus, msaId: string, options: SIWFOpts): SIWFWebhookRsp;
export function createWebhookRsp(txStatus: ITxStatus, msaId: string, options: PublishKeysOpts): PublishKeysWebhookRsp;
export function createWebhookRsp(
  { type: transactionType, providerId, referenceId }: ITxStatus,
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
