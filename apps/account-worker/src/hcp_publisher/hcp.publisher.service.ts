import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { IMethod, ISubmittableResult } from '@polkadot/types/types';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockchainService } from '#blockchain/blockchain.service';
import { ICapacityInfo, NonceConflictError } from '#blockchain/types';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { BaseConsumer } from '#consumer';
import { HcpPublishJob } from '#types/dtos/account';
import { IHcpTxStatus } from '#types/interfaces/tx-status.interface';
import { HexString } from '@polkadot/util/types';
import {
  CAPACITY_AVAILABLE_EVENT,
  CAPACITY_EXHAUSTED_EVENT,
  CapacityCheckerService,
} from '#blockchain/capacity-checker.service';
import { OnEvent } from '@nestjs/event-emitter';
import { Vec } from '@polkadot/types';
import { Call } from '@polkadot/types/interfaces';
import { TXN_WATCH_LIST_KEY } from '#types/constants';
import workerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import { PinoLogger } from 'nestjs-pino';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';

const CAPACITY_EPOCH_TIMEOUT_NAME = 'hcp_capacity_check';

/**
 * Service responsible for publishing HCP batch transactions.
 */
@Injectable()
@Processor(QueueConstants.HCP_PUBLISH_QUEUE)
export class HcpPublisherService extends BaseConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  public async onApplicationBootstrap() {
    await this.blockchainService.isReady();
    await this.capacityCheckerService.checkForSufficientCapacity();
    this.worker.concurrency = this.accountWorkerConfig[`${this.worker.name}QueueWorkerConcurrency`] || 1;
  }

  public async onApplicationShutdown(_signal?: string | undefined): Promise<void> {
    await this.hcpPublishQueue.close();
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (_err) {
      // ignore
    }
  }

  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.HCP_PUBLISH_QUEUE) private hcpPublishQueue: Queue,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    @Inject(workerConfig.KEY) private readonly accountWorkerConfig: IAccountWorkerConfig,
    private blockchainService: BlockchainService,
    private capacityCheckerService: CapacityCheckerService,
    private schedulerRegistry: SchedulerRegistry,
    protected readonly logger: PinoLogger,
  ) {
    super(logger);
  }

  /**
   * Processes a job for HCP batch publishing.
   * @param job - The job to process.
   * @returns A promise that resolves when the job is processed.
   */
  async process(job: Job<HcpPublishJob, any, string>): Promise<void> {
    let payWithCapacityTxHash: HexString;
    let payWithCapacityTx: SubmittableExtrinsic<'promise', ISubmittableResult>;
    const successSection = 'utility';
    const successMethod = 'BatchCompleted';

    try {
      this.logger.info(`Processing HCP job ${job.id}`);
      let blockNumber: number;

      // Decode the encoded extrinsics
      const txns = job.data.encodedExtrinsics.map((encoded) => this.blockchainService.createTxFromEncoded(encoded));

      // Create a Vec<Call> from the transactions
      const callVec = this.blockchainService.createType('Vec<Call>', txns);

      // Process the batch transaction
      [payWithCapacityTx, payWithCapacityTxHash, blockNumber] = await this.processBatchTxn(callVec);

      this.logger.debug(`Successful job: ${JSON.stringify(job, null, 2)}`);

      const status: IHcpTxStatus = {
        providerId: job.data.providerId,
        referenceId: job.data.referenceId,
        txHash: payWithCapacityTxHash,
        successEvent: {
          section: successSection,
          method: successMethod,
        },
        birth: payWithCapacityTx.era.asMortalEra.birth(blockNumber),
        death: payWithCapacityTx.era.asMortalEra.death(blockNumber),
      };

      const obj = {};
      obj[payWithCapacityTxHash] = JSON.stringify(status);

      await this.cacheManager.hset(TXN_WATCH_LIST_KEY, obj);

      this.logger.debug('Cached extrinsic to monitor: ', payWithCapacityTxHash);
    } catch (error: unknown) {
      if (error instanceof DelayedError) {
        job.moveToDelayed(Date.now(), job.token);
      }
      this.logger.error(error);
      throw error;
    } finally {
      await this.capacityCheckerService.checkForSufficientCapacity();
    }
  }

  /**
   * Processes a batch transaction by submitting it to the blockchain.
   *
   * @param callVec The vector of calls to be batched.
   * @returns The hash of the submitted transaction.
   * @throws Error if the transaction hash is undefined or if there is an error processing the batch.
   */
  async processBatchTxn(
    callVec: Vec<Call> | (Call | IMethod | string | Uint8Array)[],
  ): ReturnType<BlockchainService['payWithCapacityBatchAll']> {
    this.logger.trace(
      'processBatchTxn: callVec: ',
      callVec.map((c) => c.toHuman()),
    );
    try {
      return this.blockchainService.payWithCapacityBatchAll(callVec);
    } catch (error: any) {
      this.logger.error(`Error processing batch transaction: ${error}`);
      if (error instanceof NonceConflictError) {
        throw new DelayedError();
      }
      throw error;
    }
  }

  @OnEvent(CAPACITY_EXHAUSTED_EVENT)
  public async handleCapacityExhausted(capacityInfo: ICapacityInfo) {
    // Avoid spamming the log
    if (!(await this.hcpPublishQueue.isPaused())) {
      this.logger.warn('Capacity Exhausted: Pausing HCP publish queue until next epoch');
    }
    await this.hcpPublishQueue.pause();
    const blocksRemaining = capacityInfo.nextEpochStart - capacityInfo.currentBlockNumber;
    const epochTimeout = blocksRemaining * (this.blockchainService.blockTimeMs || 6000);
    try {
      // Check if a timeout with the same name already exists
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);

      // Add the new timeout
      this.schedulerRegistry.addTimeout(
        CAPACITY_EPOCH_TIMEOUT_NAME,
        setTimeout(() => this.capacityCheckerService.checkForSufficientCapacity(), epochTimeout),
      );
    } catch (_err) {
      // Ignore non-existent timeout
    }
  }

  @OnEvent(CAPACITY_AVAILABLE_EVENT)
  public async handleCapacityAvailable() {
    // Avoid spamming the log
    if (await this.hcpPublishQueue.isPaused()) {
      this.logger.trace('Capacity Available: Resuming HCP publish queue and clearing timeout');
    }
    // Get the failed jobs and check if they failed due to capacity
    const failedJobs = await this.hcpPublishQueue.getFailed();
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
    } catch (_err) {
      // ignore
    }

    await this.hcpPublishQueue.resume();
  }
}
