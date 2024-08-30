import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { Hash } from '@polkadot/types/interfaces';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { SchedulerRegistry } from '@nestjs/schedule';
import * as QueueConstants from '#lib/queues/queue-constants';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ITxStatus } from '#lib/interfaces/tx-status.interface';
import { ConfigService } from '#lib/config';
import { BlockchainService, createKeys, ICapacityInfo } from '#lib/blockchain';
import { GraphUpdateJob } from '#lib/dtos';
import { NonceService } from '#lib/services/nonce.service';
import { BaseConsumer } from '#lib/utils';
import { SECONDS_PER_BLOCK, TXN_WATCH_LIST_KEY } from '#lib/types/constants';

const CAPACITY_EPOCH_TIMEOUT_NAME = 'capacity_check';

/**
 * Service responsible for publishing graph updates.
 */
@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE)
export class GraphUpdatePublisherService extends BaseConsumer implements OnApplicationShutdown {
  public async onApplicationBootstrap() {
    await this.checkCapacity();
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
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private nonceService: NonceService,
    private schedulerRegistry: SchedulerRegistry,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * Processes a job for graph update.
   * @param job - The job to process.
   * @returns A promise that resolves when the job is processed.
   */
  async process(job: Job<GraphUpdateJob, any, string>): Promise<void> {
    let payWithCapacityTxHash: Hash = {} as Hash;
    let payWithCapacityTx: SubmittableExtrinsic<'promise', ISubmittableResult>;
    const successSection = 'statefulStorage';
    let successMethod: string;
    try {
      this.logger.log(`Processing job ${job.id} of type ${job.name}`);
      const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      switch (job.data.update.type) {
        case 'PersistPage': {
          successMethod = 'PaginatedPageUpdated';
          let payloadData: number[] = [];
          if (typeof job.data.update.payload === 'object' && 'data' in job.data.update.payload) {
            payloadData = Array.from((job.data.update.payload as { data: Uint8Array }).data);
          }
          const providerKeys = createKeys(this.configService.providerAccountSeedPhrase);
          const tx = this.blockchainService.createExtrinsicCall(
            { pallet: 'statefulStorage', extrinsic: 'upsertPage' },
            job.data.update.ownerDsnpUserId,
            job.data.update.schemaId,
            job.data.update.pageId,
            job.data.update.prevHash,
            payloadData,
          );
          [payWithCapacityTxHash, payWithCapacityTx] = await this.processSingleBatch(providerKeys, tx);
          break;
        }
        case 'DeletePage': {
          successMethod = 'PaginatedPageDeleted';
          const providerKeys = createKeys(this.configService.providerAccountSeedPhrase);
          const tx = this.blockchainService.createExtrinsicCall(
            { pallet: 'statefulStorage', extrinsic: 'deletePage' },
            job.data.update.ownerDsnpUserId,
            job.data.update.schemaId,
            job.data.update.pageId,
            job.data.update.prevHash,
          );
          [payWithCapacityTxHash, payWithCapacityTx] = await this.processSingleBatch(providerKeys, tx);
          break;
        }
        default:
          this.logger.warn('Nothing to do; unrecognized job type', job.data.update.type.toString());
          return;
      }

      this.logger.debug(`Successful job: ${JSON.stringify(job, null, 2)}`);

      const status: ITxStatus = {
        providerId: this.configService.providerId,
        referenceId: job.data.originalRequestJob.referenceId,
        txHash: payWithCapacityTxHash.toHex(),
        successEvent: {
          section: successSection,
          method: successMethod,
        },
        referenceJob: job.data.originalRequestJob,
        birth: payWithCapacityTx.era.asMortalEra.birth(lastFinalizedBlockNumber),
        death: payWithCapacityTx.era.asMortalEra.death(lastFinalizedBlockNumber),
      };

      const obj = {};
      obj[payWithCapacityTxHash.toHex()] = JSON.stringify(status);

      await this.cacheManager.hset(TXN_WATCH_LIST_KEY, obj);

      this.logger.debug('Cached extrinsic to monitor: ', payWithCapacityTxHash.toHex());
    } catch (error: unknown) {
      this.logger.error(error);
      throw error;
    } finally {
      await this.checkCapacity();
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
    providerKeys: KeyringPair,
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  ): Promise<[Hash, SubmittableExtrinsic<'promise', ISubmittableResult>]> {
    this.logger.debug(
      `Submitting tx of size ${tx.length}, nonce:${tx.nonce}, method: ${tx.method.section}.${tx.method.method}`,
    );
    try {
      const ext = this.blockchainService.createExtrinsic(
        { pallet: 'frequencyTxPayment', extrinsic: 'payWithCapacity' },
        { eventPallet: 'frequencyTxPayment', event: 'CapacityPaid' },
        providerKeys,
        tx,
      );
      const nonce = await this.nonceService.getNextNonce();
      this.logger.debug(`Capacity Wrapped Extrinsic: ${ext}, nonce:${nonce}`);
      const txHash = await ext.signAndSend(nonce);
      if (!txHash) {
        throw new Error('Tx hash is undefined');
      }
      this.logger.debug(`Tx hash: ${txHash}`);
      return [txHash, ext.extrinsic];
    } catch (error: unknown) {
      this.logger.error(`Error processing batch: ${error}`);
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
        setTimeout(() => this.checkCapacity(), epochTimeout),
      );
    } catch (err) {
      // Ignore non-existent timeout
    }
  }

  @OnEvent('capacity.available')
  public async handleCapacityAvailable() {
    // Avoid spamming the log
    if (await this.graphChangePublishQueue.isPaused()) {
      this.logger.verbose('Capacity Available: Resuming graph change publish queue and clearing timeout');
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

  /**
   * Checks the capacity of the graph publisher and takes appropriate actions based on the capacity status.
   * If the capacity is exhausted, it pauses the graph change publish queue and sets a timeout to check the capacity again.
   * If the capacity is refilled, it resumes the graph change publish queue and clears the timeout.
   * If any jobs failed due to low balance/no capacity, it retries them.
   * If any error occurs during the capacity check, it logs the error.
   */
  private async checkCapacity(): Promise<void> {
    try {
      const capacityLimit = this.configService.capacityLimit.serviceLimit;
      const capacityInfo = await this.blockchainService.capacityInfo(this.configService.providerId);
      const { remainingCapacity } = capacityInfo;
      const { currentEpoch } = capacityInfo;
      const epochCapacityKey = `epochCapacity:${currentEpoch}`;
      const epochUsedCapacity = BigInt((await this.cacheManager.get(epochCapacityKey)) ?? 0); // Fetch capacity used by the service
      let outOfCapacity = remainingCapacity <= 0n;

      if (!outOfCapacity) {
        this.logger.debug(`Capacity remaining: ${remainingCapacity}`);
        if (capacityLimit.type === 'percentage') {
          const capacityLimitPercentage = BigInt(capacityLimit.value);
          const capacityLimitThreshold = (capacityInfo.totalCapacityIssued * capacityLimitPercentage) / 100n;
          this.logger.debug(`Capacity limit threshold: ${capacityLimitThreshold}`);
          if (epochUsedCapacity >= capacityLimitThreshold) {
            outOfCapacity = true;
            this.logger.warn(`Capacity threshold reached: used ${epochUsedCapacity} of ${capacityLimitThreshold}`);
          }
        } else if (epochUsedCapacity >= capacityLimit.value) {
          outOfCapacity = true;
          this.logger.warn(`Capacity threshold reached: used ${epochUsedCapacity} of ${capacityLimit.value}`);
        }
      }

      if (outOfCapacity) {
        this.eventEmitter.emit('capacity.exhausted', capacityInfo);
      } else {
        this.eventEmitter.emit('capacity.available');
      }
    } catch (err) {
      this.logger.error('Caught error in checkCapacity', err);
    }
  }
}
