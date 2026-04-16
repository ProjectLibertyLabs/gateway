/* eslint-disable no-redeclare */
import {
  PublishHandleOpts,
  CreateHandleWebhookRsp,
  ChangeHandleWebhookRsp,
  OnChainContentOpts,
  OnChainContentWebhookRsp,
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
} from '#types/tx-notification-webhook';
import { IBaseTxStatus } from '#types/interfaces';

export interface IBaseWebhookResponse extends IBaseTxStatus {
  msaId?: string;
  blockHash: string;
}

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

function isOnChainContentOpts(o: any): o is OnChainContentOpts {
  return !!o?.schemaId && !!o?.msaId && !!o?.intentId
}

export function createWebhookRsp(txStatus: IBaseWebhookResponse, options: OnChainContentOpts): OnChainContentWebhookRsp;
export function createWebhookRsp(txStatus: IBaseWebhookResponse, options: SIWFOpts): SIWFWebhookRsp;
export function createWebhookRsp(txStatus: IBaseWebhookResponse, options: PublishKeysOpts): PublishKeysWebhookRsp;
export function createWebhookRsp(txStatus: IBaseWebhookResponse, options: PublishGraphKeysOpts): PublishGraphKeysWebhookRsp;
export function createWebhookRsp(txStatus: IBaseWebhookResponse, options: CapacityBatchAllOpts): CapacityBatchAllWebhookRsp;
export function createWebhookRsp(txStatus: IBaseWebhookResponse, options: PublishHandleOpts): PublishHandleWebhookRsp;
export function createWebhookRsp(txStatus: IBaseWebhookResponse): RetireMsaWebhookRsp | RevokeDelegationWebhookRsp;
export function createWebhookRsp(
  { type: transactionType, providerId, referenceId, msaId, blockHash, txHash }: IBaseWebhookResponse,
  options?: TxWebhookOpts,
): TxWebhookRsp {

  const baseResponse = {
    providerId,
    referenceId,
    msaId,
    blockHash,
    txHash,
    transactionType,
  };

  const baseResponseWithOptions = { ...baseResponse, ...options  }

  switch (transactionType) {
    case TransactionType.ON_CHAIN_CONTENT:
      if (isOnChainContentOpts(options)) { return baseResponseWithOptions as OnChainContentWebhookRsp; }
      break;
    case TransactionType.ADD_KEY:
      if (isPublishKeysOpts(options)) { return baseResponseWithOptions as PublishKeysWebhookRsp; }
      break;
    case TransactionType.ADD_PUBLIC_KEY_AGREEMENT:
      if (isPublishGraphKeysOpts(options)) { return baseResponseWithOptions as PublishGraphKeysWebhookRsp; }
      break;
    case TransactionType.CREATE_HANDLE:
      if (isPublishHandleOpts(options)) { return baseResponseWithOptions as CreateHandleWebhookRsp; }
      break;
    case TransactionType.CHANGE_HANDLE:
      if (isPublishHandleOpts(options)) { return baseResponseWithOptions as ChangeHandleWebhookRsp; }
      break;
    case TransactionType.SIWF_SIGNUP:
      if (isSiwfOpts(options)) { return baseResponseWithOptions as SIWFWebhookRsp; }
      break;
    case TransactionType.CAPACITY_BATCH:
      if (isCapacityBatchAllOpts(options)) { return baseResponseWithOptions as CapacityBatchAllWebhookRsp; }
      break;
    case TransactionType.RETIRE_MSA:
      return baseResponse as RetireMsaWebhookRsp;
    case TransactionType.REVOKE_DELEGATION:
      return baseResponse as RevokeDelegationWebhookRsp;
    default:
  }
  throw new Error(`Invalid transaction type ${transactionType} for webhook response`);
}
