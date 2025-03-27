import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { IMethod, ISubmittableResult, Signer, SignerResult } from '@polkadot/types/types';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockchainService } from '#blockchain/blockchain.service';
import { ICapacityInfo } from '#blockchain/types';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { BaseConsumer } from '#consumer';
import { TransactionData } from '#types/dtos/account';
import { ITxStatus } from '#account-lib/interfaces/tx-status.interface';
import { HexString } from '@polkadot/util/types';
import {
  CAPACITY_AVAILABLE_EVENT,
  CAPACITY_EXHAUSTED_EVENT,
  CapacityCheckerService,
} from '#blockchain/capacity-checker.service';
import { OnEvent } from '@nestjs/event-emitter';
import { TransactionType } from '#types/account-webhook';
import { Vec } from '@polkadot/types';
import { Call } from '@polkadot/types/interfaces';
import { getSignerForRawSignature } from '#utils/common/signature.util';
import { TXN_WATCH_LIST_KEY } from '#types/constants';
import workerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';

const CAPACITY_EPOCH_TIMEOUT_NAME = 'capacity_check';

/**
 * Service responsible for publishing account updates.
 */
@Injectable()
@Processor(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
export class TransactionPublisherService extends BaseConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  public async onApplicationBootstrap() {
    await this.capacityCheckerService.checkForSufficientCapacity();
    this.worker.concurrency = this.accountWorkerConfig[`${this.worker.name}QueueWorkerConcurrency`] || 2;
  }

  public async onApplicationShutdown(_signal?: string | undefined): Promise<void> {
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
    private blockchainService: BlockchainService,
    private schedulerRegistry: SchedulerRegistry,
    private capacityCheckerService: CapacityCheckerService,
    @Inject(workerConfig.KEY)
    private readonly accountWorkerConfig: IAccountWorkerConfig,
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
      if (!(await this.capacityCheckerService.checkForSufficientCapacity())) {
        throw new DelayedError();
      }
      this.logger.log(`Processing job ${job.id} of type ${job.name}.`);
      let tx: SubmittableExtrinsic<'promise'>;
      let targetEvent: ITxStatus['successEvent'];
      let blockNumber: number;
      switch (job.data.type) {
        case TransactionType.CREATE_HANDLE:
        case TransactionType.CHANGE_HANDLE: {
          const trx = this.blockchainService.generatePublishHandle(job.data);
          targetEvent = { section: 'handles', method: 'HandleClaimed' };
          [tx, txHash, blockNumber] = await this.processSingleTxn(trx);
          this.logger.debug(`tx: ${tx}`);
          break;
        }
        case TransactionType.SIWF_SIGNUP: {
          // eslint-disable-next-line prettier/prettier
          const txns = job.data.calls?.map((x) => this.blockchainService.createTxFromEncoded(x.encodedExtrinsic));
          const callVec = this.blockchainService.createType('Vec<Call>', txns);
          [tx, txHash, blockNumber] = await this.processBatchTxn(callVec);
          targetEvent = { section: 'utility', method: 'BatchCompleted' };
          this.logger.debug(`txns: ${txns}`);
          break;
        }
        case TransactionType.ADD_KEY: {
          const trx = await this.blockchainService.generateAddPublicKeyToMsa(job.data);
          targetEvent = { section: 'msa', method: 'PublicKeyAdded' };
          [tx, txHash, blockNumber] = await this.processSingleTxn(trx);
          this.logger.debug(`tx: ${tx}`);
          break;
        }
        case TransactionType.ADD_PUBLIC_KEY_AGREEMENT: {
          const trx = await this.blockchainService.generateAddPublicKeyAgreementToMsa(job.data);
          targetEvent = { section: 'statefulStorage', method: 'ItemizedPageUpdated' };
          [tx, txHash, blockNumber] = await this.processSingleTxn(trx);
          this.logger.debug(`tx: ${tx}`);
          break;
        }
        case TransactionType.RETIRE_MSA: {
          const trx = this.blockchainService.decodeTransaction(job.data.encodedExtrinsic);
          targetEvent = { section: 'msa', method: 'MsaRetired' };
          [tx, txHash, blockNumber] = await this.processProxyTxn(trx, job.data.accountId, job.data.signature);
          break;
        }
        case TransactionType.REVOKE_DELEGATION: {
          const trx = this.blockchainService.decodeTransaction(job.data.encodedExtrinsic);
          targetEvent = { section: 'msa', method: 'DelegationRevoked' };
          [tx, txHash, blockNumber] = await this.processProxyTxn(trx, job.data.accountId, job.data.signature);
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
        birth: tx.era.asMortalEra.birth(blockNumber),
        death: tx.era.asMortalEra.death(blockNumber),
      };
      const obj: Record<string, string> = {};
      obj[txHash] = JSON.stringify(status);
      this.cacheManager.hset(TXN_WATCH_LIST_KEY, obj);
    } catch (error: any) {
      if (error instanceof DelayedError) {
        job.moveToDelayed(Date.now(), job.token);
      } else {
        this.logger.error('Unknown error encountered: ', error, error?.stack);
      }
      throw error;
    }
  }

  /**
   * Processes a single transaction to the blockchain.
   *
   * @param providerKeys The key pair used for signing the transaction.
   * @param tx The transaction to be submitted.
   * @returns [tx, txHash, blockNumber] The transaction, transaction hash, and submitted block number.
   * @throws Error if the transaction hash is undefined or if there is an error processing the batch.
   */
  processSingleTxn(
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  ): ReturnType<BlockchainService['payWithCapacity']> {
    this.logger.debug(
      `Submitting tx of size ${tx.length}, nonce:${tx.nonce}, method: ${tx.method.section}.${tx.method.method}`,
    );
    try {
      return this.blockchainService.payWithCapacity(tx);
    } catch (error) {
      this.logger.error(`Error processing single transaction: ${error}`);
      throw error;
    }
  }

  processBatchTxn(
    callVec: Vec<Call> | (Call | IMethod | string | Uint8Array)[],
  ): ReturnType<BlockchainService['payWithCapacityBatchAll']> {
    this.logger.debug(`processBatchTxn: callVec: ${callVec.map((c) => c.toHuman())}`);
    try {
      return this.blockchainService.payWithCapacityBatchAll(callVec);
    } catch (error: any) {
      this.logger.error(`Error processing batch transaction: ${error}`);
      throw error;
    }
  }

  async processProxyTxn(
    ext: SubmittableExtrinsic<'promise', ISubmittableResult>,
    accountId: string,
    signature: HexString,
  ): Promise<[SubmittableExtrinsic<'promise'>, HexString, number]> {
    try {
      const prefixedSignature: SignerResult = { id: 1, signature };
      const signer: Signer = getSignerForRawSignature(prefixedSignature);
      const nonce = await this.blockchainService.getNonce(accountId);
      const submittableExtrinsic = await ext.signAsync(accountId, { nonce, signer });
      const txHash = (await submittableExtrinsic.send()).toHex();

      if (!txHash) throw new Error('Tx hash is undefined');

      this.logger.debug(`Tx hash: ${txHash}`);

      // The caller needs to know the block number (or approximate block number) of the block hash used when the transaction was signed.
      // But because these "proxy" transactions are signed externally, we don't know that. All we can do is use the current block number as a best guess.
      const { number: blockNumber } = await this.blockchainService.getBlockForSigning();
      return [submittableExtrinsic, txHash, blockNumber];
    } catch (error: any) {
      this.logger.error(`Error processing proxy transaction: ${error}`);
      throw error;
    }
  }

  @OnEvent(CAPACITY_EXHAUSTED_EVENT)
  public async handleCapacityExhausted(capacityInfo: ICapacityInfo) {
    await this.transactionPublishQueue.pause();
    const blocksRemaining = capacityInfo.nextEpochStart - capacityInfo.currentBlockNumber;
    const epochTimeout = blocksRemaining * (this.blockchainService.blockTimeMs || 6000);
    // Avoid spamming the log
    if (!(await this.transactionPublishQueue.isPaused())) {
      this.logger.warn(
        `Capacity Exhausted: Pausing account change publish queue until next epoch: ${epochTimeout / 1000} seconds`,
      );
    }
    try {
      // Check if a timeout with the same name already exists
      if (this.schedulerRegistry.doesExist('timeout', CAPACITY_EPOCH_TIMEOUT_NAME)) {
        // If it does, delete it
        this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
      }

      // Add the new timeout
      this.schedulerRegistry.addTimeout(
        CAPACITY_EPOCH_TIMEOUT_NAME,
        setTimeout(() => this.capacityCheckerService.checkForSufficientCapacity(), epochTimeout),
      );
    } catch (err) {
      // Handle any errors
      this.logger.error(err);
    }
  }

  @OnEvent(CAPACITY_AVAILABLE_EVENT)
  public async handleCapacityAvailable() {
    // Avoid spamming the log
    if (await this.transactionPublishQueue.isPaused()) {
      this.logger.verbose('Capacity Available: Resuming account change publish queue and clearing timeout');
    }
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
}
