import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { Hash } from '@polkadot/types/interfaces';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { Codec, ISubmittableResult } from '@polkadot/types/types';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { createKeys } from '#lib/blockchain/create-keys';
import { NonceService } from '#lib/services/nonce.service';
import { TransactionType } from '#lib/types/enums';
import { QueueConstants } from '#lib/utils/queues';
import { BaseConsumer } from '#worker/BaseConsumer';
import { RedisUtils, TransactionData } from 'libs/common/src';
import { ConfigService } from '#lib/config/config.service';
import { ITxStatus } from '#lib/interfaces/tx-status.interface';
import { IsEvent } from '@polkadot/types/metadata/decorate/types';
import { HexString } from '@polkadot/util/types';

export const SECONDS_PER_BLOCK = 12;
const CAPACITY_EPOCH_TIMEOUT_NAME = 'capacity_check';

/**
 * Service responsible for publishing account updates.
 */
@Injectable()
@Processor(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
export class TransactionPublisherService extends BaseConsumer implements OnApplicationShutdown {
  public async onApplicationBootstrap() {
    await this.checkCapacity();
  }

  public async onApplicationShutdown(signal?: string | undefined): Promise<void> {
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (err) {
      // ignore
    }
  }

  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
    private transactionPublishQueue: Queue,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private nonceService: NonceService,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    super();
  }

  /**
   * Processes a job for account update.
   * @param job - The job to process.
   * @returns A promise that resolves when the job is processed.
   */
  async process(job: Job<TransactionData, any, string>): Promise<any> {
    let txHash: HexString;
    try {
      // Check capacity first; if out of capacity, send job back to queue
      if (!(await this.checkCapacity())) {
        job.moveToDelayed(Date.now(), job.token); // fake delay, we just want to avoid processing the current job if we're out of capacity
        throw new DelayedError();
      }
      this.logger.log(`Processing job ${job.id} of type ${job.name}.`);
      const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      const providerKeys = createKeys(this.configService.providerAccountSeedPhrase);
      let tx: SubmittableExtrinsic<'promise'>;
      let targetEvent: ITxStatus['successEvent'];
      switch (job.data.type) {
        case TransactionType.CREATE_HANDLE:
        case TransactionType.CHANGE_HANDLE: {
          tx = await this.blockchainService.publishHandle(job.data);
          targetEvent = { section: 'handles', method: 'HandleClaimed' };
          txHash = await this.processSingleTxn(providerKeys, tx);
          this.logger.debug(`tx: ${tx}`);
          break;
        }
        case TransactionType.SIWF_SIGNUP: {
          // eslint-disable-next-line prettier/prettier
          const txns = job.data.calls?.map((x) => this.blockchainService.api.tx(x.encodedExtrinsic));
          const callVec = this.blockchainService.createType('Vec<Call>', txns);
          [tx, txHash] = await this.processBatchTxn(providerKeys, callVec);
          targetEvent = { section: 'utility', method: 'BatchCompleted' };
          this.logger.debug(`txns: ${txns}`);
          break;
        }
        case TransactionType.ADD_KEY: {
          tx = await this.blockchainService.addPublicKeyToMsa(job.data);
          targetEvent = { section: 'msa', method: 'PublicKeyAdded' };
          txHash = await this.processSingleTxn(providerKeys, tx);
          this.logger.debug(`tx: ${tx}`);
          break;
        }
        default: {
          throw new Error(`Invalid job type.`);
        }
      }
      this.logger.debug(`Successful job: ${JSON.stringify(job, null, 2)}`);

      const status: ITxStatus = {
        type: job.data.type,
        referenceId: job.data.referenceId,
        providerId: job.data.providerId,
        txHash,
        successEvent: targetEvent,
        birth: tx.era.asMortalEra.birth(lastFinalizedBlockNumber),
        death: tx.era.asMortalEra.death(lastFinalizedBlockNumber),
      };
      const obj: Record<string, string> = {};
      obj[txHash] = JSON.stringify(status);
      this.cacheManager.hset(RedisUtils.TXN_WATCH_LIST_KEY, obj);
    } catch (error: any) {
      if (error instanceof DelayedError) {
        throw error;
      }

      this.logger.error('Unknown error encountered: ', error, error?.stack);
      throw error;
    }
  }

  /**
   * Processes a single transaction to the blockchain.
   *
   * @param providerKeys The key pair used for signing the transaction.
   * @param tx The transaction to be submitted.
   * @returns The hash of the submitted transaction.
   * @throws Error if the transaction hash is undefined or if there is an error processing the batch.
   */
  async processSingleTxn(
    providerKeys: KeyringPair,
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  ): Promise<HexString> {
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
      const txHash = (await ext.signAndSend(nonce)).toHex();
      if (!txHash) {
        throw new Error('Tx hash is undefined');
      }
      this.logger.debug(`Tx hash: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Error processing single transaction: ${error}`);
      throw error;
    }
  }

  async processBatchTxn(
    providerKeys: KeyringPair,
    callVec: Codec,
  ): Promise<[SubmittableExtrinsic<'promise'>, HexString]> {
    this.logger.debug(`processBatchTxn: callVec: ${callVec.toHuman()}`);
    try {
      const ext = this.blockchainService.createExtrinsic(
        { pallet: 'frequencyTxPayment', extrinsic: 'payWithCapacityBatchAll' },
        providerKeys,
        callVec,
      );
      const nonce = await this.nonceService.getNextNonce();
      this.logger.debug(`Capacity Wrapped Extrinsic: ${ext}, nonce:${nonce}`);
      const txHash = (await ext.signAndSend(nonce)).toHex();
      if (!txHash) {
        throw new Error('Tx hash is undefined');
      }
      this.logger.debug(`Tx hash: ${txHash}`);
      return [ext.extrinsic, txHash];
    } catch (error: any) {
      this.logger.error(`Error processing batch transaction: ${error}`);
      throw error;
    }
  }

  /**
   * Checks the capacity of the account publisher and takes appropriate actions based on the capacity status.
   * If the capacity is exhausted, it pauses the account change publish queue and sets a timeout to check the capacity again.
   * If the capacity is refilled, it resumes the account change publish queue and clears the timeout.
   * If any jobs failed due to low balance/no capacity, it retries them.
   * If any error occurs during the capacity check, it logs the error.
   */
  private async checkCapacity(): Promise<boolean> {
    let outOfCapacity = false;
    try {
      const { capacityLimit } = this.configService;
      const capacityInfo = await this.blockchainService.capacityInfo(this.configService.providerId);
      const { remainingCapacity } = capacityInfo;
      const { currentEpoch } = capacityInfo;
      const epochCapacityKey = `epochCapacity:${currentEpoch}`;
      const epochUsedCapacity = BigInt((await this.cacheManager.get(epochCapacityKey)) ?? 0); // Fetch capacity used by the service
      outOfCapacity = remainingCapacity <= 0n;

      if (!outOfCapacity) {
        this.logger.debug(`      Capacity remaining: ${remainingCapacity}`);
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
        await this.transactionPublishQueue.pause();
        const blocksRemaining = capacityInfo.nextEpochStart - capacityInfo.currentBlockNumber;
        const epochTimeout = blocksRemaining * SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND;
        this.logger.warn(
          `Capacity Exhausted: Pausing account change publish queue until next epoch: ${epochTimeout / 1000} seconds`,
        );
        try {
          // Check if a timeout with the same name already exists
          if (this.schedulerRegistry.doesExist('timeout', CAPACITY_EPOCH_TIMEOUT_NAME)) {
            // If it does, delete it
            this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
          }

          // Add the new timeout
          this.schedulerRegistry.addTimeout(
            CAPACITY_EPOCH_TIMEOUT_NAME,
            setTimeout(() => this.checkCapacity(), epochTimeout),
          );
        } catch (err) {
          // Handle any errors
          console.error(err);
        }
      } else {
        this.logger.verbose('Capacity Available: Resuming account change publish queue and clearing timeout');
        // Get the failed jobs and check if they failed due to capacity
        const failedJobs = await this.transactionPublishQueue.getFailed();
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

        await this.transactionPublishQueue.resume();
      }
    } catch (err) {
      this.logger.error('Caught error in checkCapacity', err);
    }

    return !outOfCapacity;
  }
}
