import { InjectRedis } from '@songkeys/nestjs-redis';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SignedBlock } from '@polkadot/types/interfaces';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import { CapacityBatchAllOpts, TransactionType, TxWebhookRsp } from '#types/tx-notification-webhook';
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
import contentPublishingWorkerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';

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

  protected deserializeTxStatus(value: string): IBaseTxStatus {
    return JSON.parse(value) as IBaseTxStatus;
  }

  protected async getCurrentCapacityEpoch(_currentBlock: SignedBlock): Promise<string | number> {
    return this.blockchainService.getCurrentCapacityEpoch();
  }

  protected async handleTransactionFailure({
    moduleError,
  }: IWatchedTransactionFailureContext<IBaseTxStatus>): Promise<void> {
    this.logger.error(`Extrinsic failed with error: ${JSON.stringify(moduleError)}`);
  }

  protected async handleTransactionSuccess({
    txHash,
    txIndex,
    txStatus,
    currentBlock,
    extrinsicEvents,
    currentBlockNumber,
    successEvent,
  }: IWatchedTransactionSuccessContext<IBaseTxStatus>): Promise<void> {
    this.logger.trace(`Successfully found transaction ${txHash} in block ${currentBlockNumber}`);
    const baseResponse = { ...txStatus, blockHash: currentBlock.block.header.hash.toHex() };
    let webhookResponse: TxWebhookRsp | undefined;

    switch (txStatus.type) {
      case TransactionType.ON_CHAIN_CONTENT:
        {
          // call this.blockchainService.handleOnChainContentTxResult(successEvent)
          // create the response with createWebhookRsp
          // log the result
          // const response = createWebhookResp({
          // {...baseResponse },
          // { schemaId: 1, intentId: 2, msaId: this.blockchainService.}
          // })
          // this.logger.info(`OnChainContent: published ${} to schemaId ${} intentId ${}.`);
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

  protected async handleTransactionExpired(txStatus: IBaseTxStatus, currentBlockNumber: number): Promise<void> {
    this.logger.trace(
      `Tx ${txStatus.txHash} expired (birth: ${txStatus.birth}, death: ${txStatus.death}, currentBlock: ${currentBlockNumber})`,
    );
  }
}