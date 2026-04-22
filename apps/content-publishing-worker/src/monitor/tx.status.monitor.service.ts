import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { RegistryError } from '@polkadot/types/types';
import { BlockchainService } from '#blockchain/blockchain.service';
import { ContentPublishingQueues as QueueConstants } from '#types/constants';
import { SchedulerRegistry } from '@nestjs/schedule';
import { IPublisherJob } from '#types/interfaces';
import { IContentTxStatus } from '#content-publishing-worker/interfaces';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import workerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';
import { PinoLogger } from 'nestjs-pino';
import {
  IWatchedTransactionContext,
  IWatchedTransactionFailureContext,
  IWatchedTransactionSuccessContext,
  WatchedTransactionScannerService,
} from '#blockchain/watched-transaction-scanner.service';

@Injectable()
export class TxStatusMonitoringService extends WatchedTransactionScannerService<IContentTxStatus> {
  constructor(
    blockchainService: BlockchainService,
    schedulerRegistry: SchedulerRegistry,
    @InjectRedis() cacheManager: Redis,
    @Inject(workerConfig.KEY) private readonly workerConfig: IContentPublishingWorkerConfig,
    capacityService: CapacityCheckerService,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private readonly publishQueue: Queue,
    protected readonly logger: PinoLogger,
  ) {
    super(blockchainService, schedulerRegistry, cacheManager, workerConfig, capacityService, logger);
  }

  public async handleTransactionFailure({
    txStatus,
    moduleError,
  }: IWatchedTransactionFailureContext<IContentTxStatus>): Promise<void> {
    this.logger.error({ err: moduleError }, 'Extrinsic failed');
    const errorReport = this.handleMessagesFailure(moduleError);

    if (errorReport.pause) {
      await this.publishQueue.pause();
    }

    if (errorReport.retry) {
      await this.retryPublishJob(txStatus.referencePublishJob);
    }
  }

  public async handleTransactionSuccess({
    txStatus,
    txIndex,
    currentBlockNumber,
  }: IWatchedTransactionSuccessContext<IContentTxStatus>): Promise<void> {
    this.logger.debug(
      { txHash: txStatus.txHash, txIndex, currentBlockNumber },
      'Successfully found transaction in block',
    );
  }

  public async handleTransactionWithoutTerminalEvent({
    txIndex,
    txStatus,
    currentBlock,
    blockEvents,
    extrinsicEvents,
    currentBlockNumber,
  }: IWatchedTransactionContext<IContentTxStatus>): Promise<void> {
    if (
      txStatus.successEvent.section === 'messages' &&
      txStatus.successEvent.method === 'MessagesInBlock' &&
      blockEvents.find(
        ({ phase, event }) =>
          phase.isApplyExtrinsic && event.section === 'messages' && event.method === 'MessagesInBlock',
      )
    ) {
      this.logger.debug(
        { txHash: txStatus.txHash, txIndex, currentBlockNumber },
        'Successfully found prior MessagesInBlock event for transaction',
      );
      return;
    }

    const extrinsicEventsInBlock = extrinsicEvents.map(({ event: { method, section } }) => `${section}.${method}`);
    this.logger.error(
      {
        txStatus,
        txIndexInBlock: txIndex,
        encodedExtrinsic: currentBlock.block.extrinsics[txIndex].toHex(),
        block: { hash: currentBlock.block.header.hash.toHex(), number: currentBlockNumber },
        targetEvent: `${txStatus.successEvent.section}.${txStatus.successEvent.method}`,
        extrinsicEventsInBlock,
      },
      'Watched transaction found, but neither success nor error???',
    );
  }

  public async handleTransactionExpired(txStatus: IContentTxStatus, currentBlockNumber: number): Promise<void> {
    this.logger.warn(
      `Tx ${txStatus.txHash} expired (birth: ${txStatus.birth}, death: ${txStatus.death}, currentBlock: ${currentBlockNumber}), adding back to the publishing queue`,
    );
    await this.retryPublishJob(txStatus.referencePublishJob);
  }

  private handleMessagesFailure(moduleError: RegistryError): { pause: boolean; retry: boolean } {
    try {
      switch (moduleError.method) {
        case 'TooManyMessagesInBlock':
          // Re-try the job in the publish queue
          return { pause: false, retry: true };
        case 'UnAuthorizedDelegate':
        case 'InvalidMessageSourceAccount':
        case 'InvalidSchemaId':
        case 'ExceedsMaxMessagePayloadSizeBytes':
        case 'InvalidPayloadLocation':
        case 'UnsupportedCid':
        case 'InvalidCid':
          return { pause: false, retry: false };
        default:
          this.logger.error(`Unknown module error ${moduleError}`);
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling module error: ${error}`);
    }

    // unknown error, pause the queue
    return { pause: false, retry: false };
  }

  private async retryPublishJob(publishJob: IPublisherJob) {
    this.logger.debug(`Retrying job ${publishJob.id}`);
    await this.publishQueue.remove(publishJob.id);
    await this.publishQueue.add(`Retrying publish job - ${publishJob.id}`, publishJob, { jobId: publishJob.id });
  }
}
