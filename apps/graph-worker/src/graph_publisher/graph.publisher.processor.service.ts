import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { Hash } from '@polkadot/types/interfaces';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { SchedulerRegistry } from '@nestjs/schedule';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';
import { OnEvent } from '@nestjs/event-emitter';
import { IGraphTxStatus } from '#types/interfaces';
import { BlockchainService, createKeys, ICapacityInfo } from '#graph-lib/blockchain';
import { GraphUpdateJob } from '#types/dtos/graph';
import { NonceService } from '#graph-lib/services/nonce.service';
import { BaseConsumer } from '#graph-lib/utils';
import { SECONDS_PER_BLOCK, TXN_WATCH_LIST_KEY } from '#types/constants';
import { CapacityCheckerService } from '#graph-lib/blockchain/capacity-checker.service';
import blockchainConfig, { IBlockchainConfig } from '#graph-lib/blockchain/blockchain.config';

const CAPACITY_EPOCH_TIMEOUT_NAME = 'capacity_check';

/**
 * Service responsible for publishing graph updates.
 */
@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE)
export class GraphUpdatePublisherService extends BaseConsumer implements OnApplicationShutdown {
  public async onApplicationBootstrap() {
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
    private blockchainService: BlockchainService,
    private capacityCheckerService: CapacityCheckerService,
    private nonceService: NonceService,
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
          const providerKeys = createKeys(this.blockchainConf.providerSeedPhrase);
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
          const providerKeys = createKeys(this.blockchainConf.providerSeedPhrase);
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

      const status: IGraphTxStatus = {
        providerId: this.blockchainConf.providerId.toString(),
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
    providerKeys: KeyringPair,
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  ): Promise<[Hash, SubmittableExtrinsic<'promise', ISubmittableResult>]> {
    this.logger.debug(
      `Submitting tx of size ${tx.length}, nonce:${tx.nonce}, method: ${tx.method.section}.${tx.method.method}`,
    );
    try {
      const ext = this.blockchainService.createExtrinsic(
        { pallet: 'frequencyTxPayment', extrinsic: 'payWithCapacity' },
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
}
