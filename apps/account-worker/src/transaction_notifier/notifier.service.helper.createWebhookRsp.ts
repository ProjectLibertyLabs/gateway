/* eslint-disable no-redeclare */
import { ITxStatus } from '#account-lib/interfaces/tx-status.interface';
import {
  PublishHandleOpts,
  PublishHandleWebhookRsp,
  PublishKeysOpts,
  PublishKeysWebhookRsp,
  PublishGraphKeysOpts,
  PublishGraphKeysWebhookRsp,
  TxWebhookOpts,
  SIWFOpts,
  SIWFWebhookRsp,
  TxWebhookRsp,
  TransactionType,
  RetireMsaWebhookRsp,
  RevokeDelegationWebhookRsp,
  CapacityBatchAllOpts,
  CapacityBatchAllWebhookRsp,
} from '#types/account-webhook';

export interface IBaseWebhookResponse extends ITxStatus {
  msaId: string;
  blockHash: string;
};

// Type guards
function isPublishHandleOpts(o: any): o is PublishHandleOpts {
  return !!o?.handle;
}

function isSiwfOpts(o: any): o is SIWFOpts {
  return !!o?.handle && !!o?.accountId;
}

function isPublishKeysOpts(o: any): o is PublishKeysOpts {
  return !!o?.newPublicKey;
}

function isPublishGraphKeysOpts(o: any): o is PublishGraphKeysOpts {
  return !!o?.schemaId;
}

function isCapacityBatchAllOpts(o: any): o is CapacityBatchAllOpts {
  return !!o?.capacityWithdrawnEvent;
}

export function createWebhookRsp<O extends PublishHandleOpts, T extends PublishHandleWebhookRsp>(
  txStatus: IBaseWebhookResponse,
  options: O,
): T;
export function createWebhookRsp<O extends SIWFOpts, T extends SIWFWebhookRsp>(
  txStatus: IBaseWebhookResponse,
  options: O,
): T;
export function createWebhookRsp<O extends PublishKeysOpts, T extends PublishKeysWebhookRsp>(
  txStatus: IBaseWebhookResponse,
  options: O,
): T;
export function createWebhookRsp<O extends PublishGraphKeysOpts, T extends PublishGraphKeysWebhookRsp>(
  txStatus: IBaseWebhookResponse,
  options: O,
): T;
export function createWebhookRsp<O extends CapacityBatchAllOpts, T extends CapacityBatchAllWebhookRsp>(
  txStatus: IBaseWebhookResponse,
  options: O,
): T;
export function createWebhookRsp<T extends RetireMsaWebhookRsp>(txStatus: IBaseWebhookResponse): T;
export function createWebhookRsp<T extends RevokeDelegationWebhookRsp>(txStatus: IBaseWebhookResponse): T;
export function createWebhookRsp(
  { type: transactionType, providerId, referenceId, msaId, blockHash, txHash }: IBaseWebhookResponse,
  options?: TxWebhookOpts,
): TxWebhookRsp {
  const response = {
    transactionType,
    providerId,
    referenceId,
    msaId,
    blockHash,
    txHash,
  };
  if (transactionType === TransactionType.ADD_KEY && isPublishKeysOpts(options)) {
    return { ...response, ...options } as PublishKeysWebhookRsp;
  }

  if (transactionType === TransactionType.ADD_PUBLIC_KEY_AGREEMENT && isPublishGraphKeysOpts(options)) {
    return { ...response, ...options } as PublishGraphKeysWebhookRsp;
  }

  if (
    (transactionType === TransactionType.CHANGE_HANDLE || transactionType === TransactionType.CREATE_HANDLE) &&
    isPublishHandleOpts(options)
  ) {
    return { ...response, ...options } as PublishHandleWebhookRsp;
  }

  if (transactionType === TransactionType.RETIRE_MSA) {
    return response as RetireMsaWebhookRsp;
  }

  if (transactionType === TransactionType.REVOKE_DELEGATION) {
    return response as RevokeDelegationWebhookRsp;
  }

  if (transactionType === TransactionType.SIWF_SIGNUP && isSiwfOpts(options)) {
    return { ...response, ...options } as SIWFWebhookRsp;
  }

  if (transactionType === TransactionType.CAPACITY_BATCH && isCapacityBatchAllOpts(options)) {
    return { ...response, ...options } as CapacityBatchAllWebhookRsp;
  }

  throw new Error(`Invalid transaction type ${transactionType} for webhook response`);
}
