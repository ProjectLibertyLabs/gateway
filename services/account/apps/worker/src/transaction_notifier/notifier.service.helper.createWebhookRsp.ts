/* eslint-disable no-redeclare */
import {
  PublishHandleOpts,
  PublishHandleWebhookRsp,
  PublishKeysOpts,
  PublishKeysWebhookRsp,
  SIWFOpts,
  SIWFWebhookRsp,
  TxWebhookOpts,
} from '#lib/types/dtos/transaction.request.dto';
import { ITxStatus } from '#lib/interfaces/tx-status.interface';

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
