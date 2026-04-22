import { InjectRedis } from '@songkeys/nestjs-redis';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { createWebhookRsp } from '#webhooks-lib/helpers/createWebhookRsp.helper';
import { SchedulerRegistry } from '@nestjs/schedule';
import { IBaseTxStatus } from '#types/interfaces';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import { CapacityBatchAllOpts, TransactionType, TxWebhookRsp } from '#types/tx-notification-webhook';
import accountWorkerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import { PinoLogger } from 'nestjs-pino';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import {
  IWatchedTransactionFailureContext,
  IWatchedTransactionSuccessContext,
  WatchedTransactionScannerService,
} from '#blockchain/watched-transaction-scanner.service';
import { BaseWebhookService } from '#webhooks-lib/base.webhook.service';

// For watching transactions directly on chain.
@Injectable()
export class TxnNotifierService extends WatchedTransactionScannerService<IBaseTxStatus> {
  constructor(
    blockchainService: BlockchainRpcQueryService,
    schedulerRegistry: SchedulerRegistry,
    @InjectRedis() cacheManager: Redis,
    @Inject(accountWorkerConfig.KEY) private readonly workerConfig: IAccountWorkerConfig,
    capacityService: CapacityCheckerService,
    private readonly providerWebhookService: BaseWebhookService,
    protected readonly logger: PinoLogger,
  ) {
    super(blockchainService, schedulerRegistry, cacheManager, workerConfig, capacityService, logger);
  }

  public async handleTransactionFailure({
    moduleError,
  }: IWatchedTransactionFailureContext<IBaseTxStatus>): Promise<void> {
    this.logger.error(`Extrinsic failed with error: ${JSON.stringify(moduleError)}`);
  }

  public async handleTransactionSuccess({
    txIndex,
    txStatus,
    currentBlock,
    extrinsicEvents,
    currentBlockNumber,
    successEvent,
  }: IWatchedTransactionSuccessContext<IBaseTxStatus>): Promise<void> {
    this.logger.trace(`Successfully found transaction ${txStatus.txHash} in block ${currentBlockNumber}`);
    const baseResponse = { ...txStatus, blockHash: currentBlock.block.header.hash.toHex() };
    let webhookResponse: TxWebhookRsp | undefined;

    switch (txStatus.type) {
      case TransactionType.CHANGE_HANDLE:
      case TransactionType.CREATE_HANDLE:
        {
          const handleTxnValues = this.blockchainService.handlePublishHandleTxResult(successEvent);

          const response = createWebhookRsp(
            { ...baseResponse, msaId: handleTxnValues.msaId },
            { handle: handleTxnValues.handle },
          );
          webhookResponse = response;

          this.logger.debug(handleTxnValues.debugMsg);
          this.logger.info(
            `Handles: ${response.transactionType} finalized handle ${response.handle} for msaId ${response.msaId}.`,
          );
        }
        break;

      case TransactionType.SIWF_SIGNUP:
        {
          const siwfTxnValues = await this.blockchainService.handleSIWFTxnResult(extrinsicEvents);

          const response = createWebhookRsp(
            { ...baseResponse, msaId: siwfTxnValues.msaId },
            {
              accountId: siwfTxnValues.address,
              handle: siwfTxnValues.handle,
            },
          );
          webhookResponse = response;

          this.logger.info(
            `SIWF: ${siwfTxnValues.address} Signed up handle ${response.handle} for msaId ${response.msaId} delegated to provider ${siwfTxnValues.newProvider}.`,
          );
        }
        break;

      case TransactionType.ADD_KEY:
        {
          const publicKeyValues = this.blockchainService.handlePublishKeyTxResult(successEvent);

          const response = createWebhookRsp(
            { ...baseResponse, msaId: publicKeyValues.msaId },
            {
              newPublicKey: publicKeyValues.newPublicKey,
            },
          );
          webhookResponse = response;

          this.logger.info(`Keys: Added the key ${response.newPublicKey} for msaId ${response.msaId}.`);
        }
        break;

      case TransactionType.ADD_PUBLIC_KEY_AGREEMENT:
        {
          const itemizedPageUpdated = this.blockchainService.handlePublishPublicKeyAgreementTxResult(successEvent);

          const response = createWebhookRsp(
            { ...baseResponse, msaId: itemizedPageUpdated.msaId },
            {
              schemaId: itemizedPageUpdated.intentId,
            },
          );
          webhookResponse = response;

          this.logger.info(`Keys: Added the graph key msaId ${response.msaId} and schemaId ${response.schemaId}.`);
        }
        break;

      case TransactionType.RETIRE_MSA:
        {
          const msaRetired = this.blockchainService.handleRetireMsaTxResult(successEvent);
          webhookResponse = createWebhookRsp({ ...baseResponse, msaId: msaRetired.msaId });
        }
        break;

      case TransactionType.REVOKE_DELEGATION:
        {
          const delegationRevoked = this.blockchainService.handleRevokeDelegationTxResult(successEvent);
          webhookResponse = createWebhookRsp({
            ...baseResponse,
            msaId: delegationRevoked.msaId,
            providerId: delegationRevoked.providerId,
          });
        }
        break;

      case TransactionType.CAPACITY_BATCH:
        {
          const capacityEvent = extrinsicEvents.find(
            ({ event }) => event.section === 'capacity' && event.method === 'CapacityWithdrawn',
          )?.event;
          const capacityWithdrawn = this.blockchainService.handleCapacityWithdrawn(capacityEvent);
          const { calls } = this.blockchainService.handlePayWithCapacityBatchAll(
            currentBlock.block.extrinsics[txIndex],
          );
          webhookResponse = createWebhookRsp({ ...baseResponse, providerId: capacityWithdrawn.msaId }, {
            calls,
            capacityWithdrawnEvent: {
              msaId: capacityWithdrawn.msaId,
              amount: capacityWithdrawn.amount,
            },
          } as CapacityBatchAllOpts);
        }
        break;

      default:
        this.logger.error(`Unknown transaction type on job.data: ${txStatus.type}`);
        break;
    }

    if (!webhookResponse) {
      return;
    }

    let retries = 0;
    while (retries < this.workerConfig.healthCheckMaxRetries) {
      try {
        this.logger.debug(webhookResponse, 'Sending transaction notification to webhook');
        await this.providerWebhookService.notify(webhookResponse);
        this.logger.debug('Transaction Notification sent to webhook');
        break;
      } catch (error) {
        this.logger.error(error, 'Failed to send notification to webhook');
        retries += 1;
      }
    }
  }

  public async handleTransactionExpired(txStatus: IBaseTxStatus, currentBlockNumber: number): Promise<void> {
    this.logger.trace(
      `Tx ${txStatus.txHash} expired (birth: ${txStatus.birth}, death: ${txStatus.death}, currentBlock: ${currentBlockNumber})`,
    );
  }
}
