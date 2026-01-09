import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DelayedError, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { IMethod, ISubmittableResult } from '@polkadot/types/types';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockchainService } from '#blockchain/blockchain.service';
import {
  CAPACITY_AVAILABLE_EVENT,
  CAPACITY_EXHAUSTED_EVENT,
  CapacityCheckerService,
} from '#blockchain/capacity-checker.service';
import { ICapacityInfo, NonceConflictError } from '#blockchain/types';
import { OnEvent } from '@nestjs/event-emitter';
import { Vec } from '@polkadot/types';
import { Call } from '@polkadot/types/interfaces';
import { TXN_WATCH_LIST_KEY } from '#types/constants';
import { BaseConsumer } from '#consumer';
import { PinoLogger } from 'nestjs-pino';
import { ITxStatusBase } from '#types/interfaces/tx-status.interface';
import { HexString } from '@polkadot/util/types';

/**
 * Abstract base class for publisher services that handle blockchain transactions.
 * Provides common functionality for capacity management, transaction processing,
 * and lifecycle hooks.
 */
@Injectable()
export abstract class BasePublisherService
  extends BaseConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  /**
   * The queue this publisher service manages
   */
  protected abstract readonly queue: Queue;

  /**
   * The name used for the capacity epoch timeout
   */
  protected abstract readonly capacityTimeoutName: string;

  /**
   * Worker configuration key for queue concurrency
   */
  protected abstract readonly workerConcurrencyConfigKey: string;

  /**
   * Worker configuration object
   */
  protected abstract readonly workerConfig: any;

  constructor(
    @InjectRedis() protected readonly cacheManager: Redis,
    protected readonly blockchainService: BlockchainService,
    protected readonly schedulerRegistry: SchedulerRegistry,
    protected readonly capacityCheckerService: CapacityCheckerService,
    protected readonly logger: PinoLogger,
  ) {
    super(logger);
  }

  public async onApplicationBootstrap() {
    await this.blockchainService.isReady();
    await this.capacityCheckerService.checkForSufficientCapacity();
    this.worker.concurrency = this.workerConfig[this.workerConcurrencyKey] || 1;
  }

  public async onApplicationShutdown(_signal?: string | undefined): Promise<void> {
    try {
      this.schedulerRegistry.deleteTimeout(this.capacityTimeoutName);
    } catch (_err) {
      // ignore
    }
  }

  /**
   * Processes a single transaction to the blockchain.
   *
   * @param tx The transaction to be submitted.
   * @returns [tx, txHash, blockNumber] The transaction, transaction hash, and submitted block number.
   * @throws Error if the transaction hash is undefined or if there is an error processing the transaction.
   */
  protected processSingleTxn(
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  ): ReturnType<BlockchainService['payWithCapacity']> {
    this.logger.debug(
      `Submitting tx of size ${tx.length}, nonce:${tx.nonce}, method: ${tx.method.section}.${tx.method.method}`,
    );
    try {
      return this.blockchainService.payWithCapacity(tx);
    } catch (error) {
      this.logger.error(`Error processing single transaction: ${error}`);
      // Allow retry on nonce conflict
      if (error instanceof NonceConflictError) {
        throw new DelayedError();
      }
      throw error;
    }
  }

  /**
   * Processes a batch transaction by submitting it to the blockchain.
   *
   * @param callVec The vector of calls to be batched.
   * @returns [tx, txHash, blockNumber] The transaction, transaction hash, and submitted block number.
   * @throws Error if the transaction hash is undefined or if there is an error processing the batch.
   */
  protected processBatchTxn(
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

  /**
   * Caches transaction status to Redis for monitoring.
   *
   * @param txHash The transaction hash.
   * @param status The transaction status object to cache.
   */
  protected async cacheTransactionStatus(txHash: HexString, status: ITxStatusBase): Promise<void> {
    const obj: Record<string, string> = {};
    obj[txHash] = JSON.stringify(status);
    await this.cacheManager.hset(TXN_WATCH_LIST_KEY, obj);
    this.logger.debug('Cached extrinsic to monitor: ', txHash);
  }

  /**
   * Handles capacity exhausted events by pausing the queue and scheduling a check
   * for when capacity should be available again.
   */
  @OnEvent(CAPACITY_EXHAUSTED_EVENT)
  public async handleCapacityExhausted(capacityInfo: ICapacityInfo) {
    await this.queue.pause();
    const blocksRemaining = capacityInfo.nextEpochStart - capacityInfo.currentBlockNumber;
    const epochTimeout = blocksRemaining * (this.blockchainService.blockTimeMs || 6000);
    // Avoid spamming the log
    if (!(await this.queue.isPaused())) {
      this.logger.warn(
        `Capacity Exhausted: Pausing ${this.queue.name} queue until next epoch: ${epochTimeout / 1000} seconds`,
      );
    }
    try {
      // Check if a timeout with the same name already exists
      if (this.schedulerRegistry.doesExist('timeout', this.capacityTimeoutName)) {
        // If it does, delete it
        this.schedulerRegistry.deleteTimeout(this.capacityTimeoutName);
      }

      // Add the new timeout
      this.schedulerRegistry.addTimeout(
        this.capacityTimeoutName,
        setTimeout(() => this.capacityCheckerService.checkForSufficientCapacity(), epochTimeout),
      );
    } catch (err) {
      // Handle any errors
      this.logger.error(err);
    }
  }

  /**
   * Handles capacity available events by resuming the queue and retrying
   * any jobs that failed due to capacity issues.
   */
  @OnEvent(CAPACITY_AVAILABLE_EVENT)
  public async handleCapacityAvailable() {
    // Avoid spamming the log
    if (await this.queue.isPaused()) {
      this.logger.trace(`Capacity Available: Resuming ${this.queue.name} queue and clearing timeout`);
    }
    // Get the failed jobs and check if they failed due to capacity
    const failedJobs = await this.queue.getFailed();
    const capacityFailedJobs = failedJobs.filter((job) =>
      /inability to pay some fees/i.test(job.failedReason),
    );
    // Retry the failed jobs
    await Promise.all(
      capacityFailedJobs.map(async (job) => {
        this.logger.debug(`Retrying job ${job.id}`);
        job.retry();
      }),
    );
    try {
      this.schedulerRegistry.deleteTimeout(this.capacityTimeoutName);
    } catch (_err) {
      // ignore
    }

    await this.queue.resume();
  }
}
