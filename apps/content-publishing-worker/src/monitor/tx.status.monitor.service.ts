import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { RegistryError } from '@polkadot/types/types';
import { BlockchainService } from '#blockchain/blockchain.service';
import { ContentPublishingQueues as QueueConstants, SECONDS_PER_BLOCK, TXN_WATCH_LIST_KEY } from '#types/constants';
import { BlockchainScannerService } from '#content-publishing-lib/utils/blockchain-scanner.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SignedBlock } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { HexString } from '@polkadot/util/types';
import { IContentTxStatus, IPublisherJob } from '#types/interfaces';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import workerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';

@Injectable()
export class TxStatusMonitoringService extends BlockchainScannerService {
  async onApplicationBootstrap() {
    await this.blockchainService.isReady();
    const pendingTxns = await this.cacheManager.hkeys(TXN_WATCH_LIST_KEY);
    // If no transactions pending, skip to end of chain at startup
    if (pendingTxns.length === 0) {
      const blockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      await this.setLastSeenBlockNumber(blockNumber);
    }
    this.schedulerRegistry.addInterval(
      this.intervalName,
      setInterval(() => this.scan(), this.config.blockchainScanIntervalSeconds * MILLISECONDS_PER_SECOND),
    );
  }

  async onApplicationShutdown(_signal?: string | undefined) {
    if (this.schedulerRegistry.doesExist('interval', this.intervalName)) {
      this.schedulerRegistry.deleteInterval(this.intervalName);
    }
  }

  constructor(
    blockchainService: BlockchainService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRedis() cacheManager: Redis,
    @Inject(workerConfig.KEY) private readonly config: IContentPublishingWorkerConfig,
    private readonly capacityService: CapacityCheckerService,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private readonly publishQueue: Queue,
  ) {
    super(cacheManager, blockchainService, new Logger(TxStatusMonitoringService.prototype.constructor.name));
    this.scanParameters = { onlyFinalized: this.config.trustUnfinalizedBlocks };
    this.registerChainEventHandler(['capacity.UnStaked', 'capacity.Staked'], () =>
      this.capacityService.checkForSufficientCapacity(),
    );
  }

  public get intervalName() {
    return `${this.constructor.name}:blockchainScan`;
  }

  protected async processCurrentBlock(currentBlock: SignedBlock, blockEvents: FrameSystemEventRecord[]): Promise<void> {
    const currentBlockNumber = currentBlock.block.header.number.toNumber();

    // Get set of tx hashes to monitor from cache
    const pendingTxns = (await this.cacheManager.hvals(TXN_WATCH_LIST_KEY)).map(
      (val) => JSON.parse(val) as IContentTxStatus,
    );

    const extrinsicIndices: [HexString, number][] = [];
    currentBlock.block.extrinsics.forEach((extrinsic, index) => {
      if (pendingTxns.some(({ txHash }) => txHash === extrinsic.hash.toHex())) {
        extrinsicIndices.push([extrinsic.hash.toHex(), index]);
      }
    });

    let pipeline = this.cacheManager.multi({ pipeline: true });

    if (extrinsicIndices.length > 0) {
      const epoch = await this.blockchainService.getCurrentCapacityEpoch(currentBlock.block.header.hash);
      const events: FrameSystemEventRecord[] = blockEvents.filter(
        ({ phase }) => phase.isApplyExtrinsic && extrinsicIndices.some((index) => phase.asApplyExtrinsic.eq(index)),
      );

      const totalCapacityWithdrawn: bigint = events.reduce((sum, { event }) => {
        if (this.blockchainService.events.capacity.CapacityWithdrawn.is(event)) {
          return sum + event.data.amount.toBigInt();
        }
        return sum;
      }, 0n);

      // eslint-disable-next-line no-restricted-syntax
      for (const [txHash, txIndex] of extrinsicIndices) {
        const extrinsicEvents = events.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(txIndex),
        );
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const txStatusStr = (await this.cacheManager.hget(TXN_WATCH_LIST_KEY, txHash))!;
        const txStatus = JSON.parse(txStatusStr) as IContentTxStatus;
        const successEvent = extrinsicEvents.find(
          ({ event }) =>
            event.section === txStatus.successEvent.section && event.method === txStatus.successEvent.method,
        )?.event;
        const failureEvent = extrinsicEvents.find(({ event }) =>
          this.blockchainService.events.system.ExtrinsicFailed.is(event),
        )?.event;

        // TODO: Should the webhook provide for reporting failure?
        if (failureEvent && this.blockchainService.events.system.ExtrinsicFailed.is(failureEvent)) {
          const { dispatchError } = failureEvent.data;
          const moduleThatErrored = dispatchError.asModule;
          const moduleError = dispatchError.registry.findMetaError(moduleThatErrored);
          this.logger.error(`Extrinsic failed with error: ${JSON.stringify(moduleError)}`);
          const errorReport = this.handleMessagesFailure(moduleError);

          if (errorReport.pause) {
            await this.publishQueue.pause();
          }

          if (errorReport.retry) {
            await this.retryPublishJob(txStatus.referencePublishJob);
          }
        } else if (successEvent) {
          this.logger.verbose(`Successfully found transaction ${txHash} in block ${currentBlockNumber}`);
        } else {
          this.logger.error(`Watched transaction ${txHash} found, but neither success nor error???`);
        }

        pipeline = pipeline.hdel(TXN_WATCH_LIST_KEY, txHash); // Remove txn from watch list
        const idx = pendingTxns.findIndex((value) => value.txHash === txHash);
        pendingTxns.slice(idx, 1);
      }

      await this.setEpochCapacity(epoch, totalCapacityWithdrawn);
    }

    // Now check all pending transactions for expiration as of this block
    // eslint-disable-next-line no-restricted-syntax
    for (const { birth, death, txHash, referencePublishJob } of pendingTxns) {
      if (death <= currentBlockNumber) {
        this.logger.warn(
          `Tx ${txHash} expired (birth: ${birth}, death: ${death}, currentBlock: ${currentBlockNumber}), adding back to the publishing queue`,
        );
        // could not find the transaction, this might happen if transaction never gets into a block
        await this.retryPublishJob(referencePublishJob);
        pipeline = pipeline.hdel(TXN_WATCH_LIST_KEY, txHash);
        const idx = pendingTxns.findIndex((value) => value.txHash === txHash);
        pendingTxns.slice(idx, 1);
      }
    }

    // Execute marshalled Redis transactions
    await pipeline.exec();
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

  private async setEpochCapacity(epoch: number, capacityWithdrawn: bigint): Promise<void> {
    const epochCapacityKey = `epochCapacity:${epoch}`;

    try {
      const savedCapacity = await this.cacheManager.get(epochCapacityKey);
      const epochCapacity = BigInt(savedCapacity ?? 0);
      const newEpochCapacity = epochCapacity + capacityWithdrawn;

      const epochDurationBlocks = await this.blockchainService.getCurrentEpochLength();
      const epochDuration = epochDurationBlocks * SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND;
      await this.cacheManager.setex(epochCapacityKey, epochDuration, newEpochCapacity.toString());
    } catch (error) {
      this.logger.error(`Error setting epoch capacity: ${error}`);
    }
  }

  private async retryPublishJob(publishJob: IPublisherJob) {
    this.logger.debug(`Retrying job ${publishJob.id}`);
    await this.publishQueue.remove(publishJob.id);
    await this.publishQueue.add(`Retrying publish job - ${publishJob.id}`, publishJob, { jobId: publishJob.id });
  }
}
