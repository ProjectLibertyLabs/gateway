import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { SchedulerRegistry } from '@nestjs/schedule';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';
import { OnEvent } from '@nestjs/event-emitter';
import { IGraphTxStatus } from '#types/interfaces';
import { GraphUpdateJob } from '#types/dtos/graph';
import { BaseConsumer } from '#consumer';
import { SECONDS_PER_BLOCK, TXN_WATCH_LIST_KEY } from '#types/constants';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainService } from '#blockchain/blockchain.service';
import { ICapacityInfo, NonceConflictError } from '#blockchain/types';
import { HexString } from '@polkadot/util/types';
import workerConfig, { IGraphWorkerConfig } from '#graph-worker/worker.config';

const CAPACITY_EPOCH_TIMEOUT_NAME = 'capacity_check';

/**
 * Service responsible for publishing graph updates.
 */
@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE)
export class GraphUpdatePublisherService extends BaseConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  public async onApplicationBootstrap() {
    this.worker.concurrency = this.graphWorkerConfig[`${this.worker.name}QueueWorkerConcurrency`] || 1;
    await this.capacityCheckerService.checkForSufficientCapacity();
  }

  public async onApplicationShutdown(_signal?: string | undefined): Promise<void> {
    await this.graphChangePublishQueue.close();
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (err) {
      // ignore
    }
  }

  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE) private graphChangePublishQueue: Queue,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    @Inject(workerConfig.KEY) private readonly graphWorkerConfig: IGraphWorkerConfig,
    private blockchainService: BlockchainService,
    private capacityCheckerService: CapacityCheckerService,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    super();
  }

  /**
   * Processes a job for graph update.
   * @param job - The job to process.
   * @returns A promise that resolves when the job is processed.
   */
  async process(job: Job<GraphUpdateJob, any, string>): Promise<void> {
    let payWithCapacityTxHash: HexString;
    let payWithCapacityTx: SubmittableExtrinsic<'promise', ISubmittableResult>;
    const successSection = 'statefulStorage';
    let successMethod: string;
    try {
      this.logger.info(`Processing job ${job.id} of type ${job.name}`);
      let blockNumber: number;
      switch (job.data.update.type) {
        case 'PersistPage': {
          successMethod = 'PaginatedPageUpdated';
          let payloadData: number[] = [];
          if (typeof job.data.update.payload === 'object' && 'data' in job.data.update.payload) {
            payloadData = Array.from((job.data.update.payload as { data: Uint8Array }).data);
          }
          const tx = this.blockchainService.generateUpsertPage(
            job.data.update.ownerDsnpUserId,
            job.data.update.schemaId,
            job.data.update.pageId,
            job.data.update.prevHash,
            payloadData,
          );
          [payWithCapacityTx, payWithCapacityTxHash, blockNumber] = await this.processSingleBatch(tx);
          break;
        }
        case 'DeletePage': {
          successMethod = 'PaginatedPageDeleted';
          const tx = this.blockchainService.generateDeletePage(
            job.data.update.ownerDsnpUserId,
            job.data.update.schemaId,
            job.data.update.pageId,
            job.data.update.prevHash,
          );
          [payWithCapacityTx, payWithCapacityTxHash, blockNumber] = await this.processSingleBatch(tx);
          break;
        }
        default:
          this.logger.warn('Nothing to do; unrecognized job type', job.data.update.type.toString());
          return;
      }

      this.logger.debug(`Successful job: ${JSON.stringify(job, null, 2)}`);

      const status: IGraphTxStatus = {
        providerId: this.blockchainConf.providerId.toString(),
        referenceId: job.data.originalRequestJob.referenceId,
        txHash: payWithCapacityTxHash,
        successEvent: {
          section: successSection,
          method: successMethod,
        },
        referenceJob: job.data.originalRequestJob,
        birth: payWithCapacityTx.era.asMortalEra.birth(blockNumber),
        death: payWithCapacityTx.era.asMortalEra.death(blockNumber),
      };

      const obj = {};
      obj[payWithCapacityTxHash] = JSON.stringify(status);

      await this.cacheManager.hset(TXN_WATCH_LIST_KEY, obj);

      this.logger.debug('Cached extrinsic to monitor: ', payWithCapacityTxHash);
    } catch (error: unknown) {
      if (error instanceof DelayedError) {
        job.moveToDelayed(Date.now(), job.token); // fake delay, we just want to avoid processing the current job if we're out of capacity
      }
      this.logger.error(error);
      throw error;
    } finally {
      await this.capacityCheckerService.checkForSufficientCapacity();
    }
  }

  /**
   * Processes a single batch by submitting a transaction to the blockchain.
   *
   * @param providerKeys The key pair used for signing the transaction.
   * @param tx The transaction to be submitted.
   * @returns The hash of the submitted transaction.
   * @throws Error if the transaction hash is undefined or if there is an error processing the batch.
   */
  async processSingleBatch(
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  ): ReturnType<BlockchainService['payWithCapacity']> {
    this.logger.debug(
      `Submitting tx of size ${tx.length}, nonce:${tx.nonce}, method: ${tx.method.section}.${tx.method.method}`,
    );
    try {
      return this.blockchainService.payWithCapacity(tx);
    } catch (error: any) {
      this.logger.error(`Error processing batch: ${error}`);
      if (error instanceof NonceConflictError) {
        throw new DelayedError();
      }
      throw error;
    }
  }

  @OnEvent('capacity.exhausted')
  public async handleCapacityExhausted(capacityInfo: ICapacityInfo) {
    // Avoid spamming the log
    if (!(await this.graphChangePublishQueue.isPaused())) {
      this.logger.warn('Capacity Exhausted: Pausing graph change publish queue until next epoch');
    }
    await this.graphChangePublishQueue.pause();
    const blocksRemaining = capacityInfo.nextEpochStart - capacityInfo.currentBlockNumber;
    const epochTimeout = blocksRemaining * SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND;
    try {
      // Check if a timeout with the same name already exists
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);

      // Add the new timeout
      this.schedulerRegistry.addTimeout(
        CAPACITY_EPOCH_TIMEOUT_NAME,
        setTimeout(() => this.capacityCheckerService.checkForSufficientCapacity(), epochTimeout),
      );
    } catch (err) {
      // Ignore non-existent timeout
    }
  }

  @OnEvent('capacity.available')
  public async handleCapacityAvailable() {
    // Avoid spamming the log
    if (await this.graphChangePublishQueue.isPaused()) {
      this.logger.trace('Capacity Available: Resuming graph change publish queue and clearing timeout');
    }
    // Get the failed jobs and check if they failed due to capacity
    const failedJobs = await this.graphChangePublishQueue.getFailed();
    const capacityFailedJobs = failedJobs.filter((job) =>
      job.failedReason?.includes('1010: Invalid Transaction: Inability to pay some fees'),
    );
    // Retry the failed jobs
    await Promise.all(
      capacityFailedJobs.map(async (job) => {
        this.logger.debug(`Retrying job ${job.id}`);
        job.retry();
      }),
    );
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (err) {
      // ignore
    }

    await this.graphChangePublishQueue.resume();
  }
}
