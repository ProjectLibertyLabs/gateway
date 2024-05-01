/* eslint-disable no-redeclare */
import { Job } from 'bullmq';
import {
  PublishHandleOpts,
  PublishHandleWebhookRsp,
  PublishKeysOpts,
  PublishKeysWebhookRsp,
  SIWFOpts,
  SIWFWebhookRsp,
  TxMonitorJob,
  TxWebhookOpts,
} from '#lib/types/dtos/transaction.request.dto';

export function createWebhookRsp(
  job: Job<TxMonitorJob, any, string>,
  msaId: string,
  options: PublishHandleOpts,
): PublishHandleWebhookRsp;
export function createWebhookRsp(job: Job<TxMonitorJob, any, string>, msaId: string, options: SIWFOpts): SIWFWebhookRsp;
export function createWebhookRsp(
  job: Job<TxMonitorJob, any, string>,
  msaId: string,
  options: PublishKeysOpts,
): PublishKeysWebhookRsp;
export function createWebhookRsp(job: Job<TxMonitorJob, any, string>, msaId: string, options: TxWebhookOpts): unknown {
  return {
    transactionType: job.data.type,
    providerId: job.data.providerId,
    referenceId: job.data.referenceId,
    msaId,
    ...options,
  };
}
