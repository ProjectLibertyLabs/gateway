import { InjectRedis } from '@songkeys/nestjs-redis';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SignedBlock } from '@polkadot/types/interfaces';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import {
  CapacityBatchAllOpts,
  TransactionStatus,
  TransactionType,
  TxWebhookExpiredRsp,
  TxWebhookFailureRsp,
  TxWebhookRsp,
} from '#types/tx-notification-webhook';
import { PinoLogger } from 'nestjs-pino';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import {
  IWatchedTransactionFailureContext,
  IWatchedTransactionSuccessContext,
  WatchedTransactionScannerService,
} from '#blockchain/watched-transaction-scanner.service';
import { BaseWebhookService } from '#webhooks-lib/base.webhook.service';
import { createWebhookRsp } from '#webhooks-lib/helpers/createWebhookRsp.helper';
import { IBaseTxStatus } from '#types/interfaces';
import contentPublishingWorkerConfig, {
  IContentPublishingWorkerConfig,
} from '#content-publishing-worker/worker.config';

@Injectable()
export class TxnNotifierService extends WatchedTransactionScannerService<IBaseTxStatus> {
  constructor(
    blockchainService: BlockchainRpcQueryService,
    schedulerRegistry: SchedulerRegistry,
    @InjectRedis() cacheManager: Redis,
    @Inject(contentPublishingWorkerConfig.KEY) private readonly workerConfig: IContentPublishingWorkerConfig,
    capacityService: CapacityCheckerService,
    private readonly providerWebhookService: BaseWebhookService,
    protected readonly logger: PinoLogger,
  ) {
    super(blockchainService, schedulerRegistry, cacheManager, workerConfig, capacityService, logger);
  }

  public async handleTransactionFailure({
    txStatus,
    currentBlock,
    moduleError,
  }: IWatchedTransactionFailureContext<IBaseTxStatus>): Promise<void> {
    this.logger.error(`Extrinsic failed with error: ${JSON.stringify(moduleError)}`);
    const { type: transactionType, providerId, referenceId, txHash } = txStatus;
    const baseResponse = {
      transactionType,
      providerId,
      referenceId,
      txHash,
      blockHash: currentBlock.block.header.hash.toHex(),
    };

    const response: TxWebhookFailureRsp = {
      ...baseResponse,
      status: TransactionStatus.FAILED,
      error: JSON.stringify(moduleError),
    };
    await this.sendWebhookNotification(response);
  }

  public async handleTransactionSuccess({
    txIndex,
    txStatus,
    currentBlock,
    extrinsicEvents,
    currentBlockNumber,
  }: IWatchedTransactionSuccessContext<IBaseTxStatus>): Promise<void> {
    this.logger.trace(`Successfully found transaction ${txStatus.txHash} in block ${currentBlockNumber}`);
    const baseResponse = {
      ...txStatus,
      blockHash: currentBlock.block.header.hash.toHex(),
      status: TransactionStatus.SUCCESS,
    };
    let webhookResponse: TxWebhookRsp | undefined;

    if (txStatus.type === TransactionType.CAPACITY_BATCH) {
      {
        const capacityEvent = extrinsicEvents.find(
          ({ event }) => event.section === 'capacity' && event.method === 'CapacityWithdrawn',
        )?.event;
        const capacityWithdrawn = this.blockchainService.handleCapacityWithdrawn(capacityEvent);
        const { calls } = this.blockchainService.handlePayWithCapacityBatchAll(currentBlock.block.extrinsics[txIndex]);
        webhookResponse = createWebhookRsp({ ...baseResponse, providerId: capacityWithdrawn.msaId }, {
          calls,
          capacityWithdrawnEvent: {
            msaId: capacityWithdrawn.msaId,
            amount: capacityWithdrawn.amount,
          },
        } as CapacityBatchAllOpts);
      }
    } else {
      const message = `Unknown transaction type on job.data: ${txStatus.type}`;
      throw new Error(message);
    }

    if (!webhookResponse) {
      return;
    }

    await this.sendWebhookNotification(webhookResponse);
  }

  private async sendWebhookNotification(webhookResponse: TxWebhookRsp): Promise<void> {
    let retries = 0;
    while (retries < this.workerConfig.healthCheckMaxRetries) {
      try {
        this.logger.debug(webhookResponse, 'Sending transaction notification to webhook');
        await this.providerWebhookService.notify(webhookResponse);
        this.logger.debug('Transaction Notification sent to webhook');
        return;
      } catch (error) {
        this.logger.error(error, 'Failed to send notification to webhook');
        retries += 1;
      }
    }
  }

  public async handleTransactionExpired(txStatus: IBaseTxStatus, currentBlock: SignedBlock): Promise<void> {
    this.logger.trace(
      `Tx ${txStatus.txHash} expired (birth: ${txStatus.birth}, death: ${txStatus.death}, currentBlock: ${currentBlock.block.header.number.toNumber()})`,
    );
    const { type: transactionType, providerId, referenceId, txHash } = txStatus;
    const baseResponse = {
      transactionType,
      providerId,
      referenceId,
      txHash,
      blockHash: currentBlock.block.header.hash.toHex(),
    };

    const response: TxWebhookExpiredRsp = {
      ...baseResponse,
      status: TransactionStatus.EXPIRED,
    };
    await this.sendWebhookNotification(response);
  }
}
