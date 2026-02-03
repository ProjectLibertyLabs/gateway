import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ISubmittableResult, Signer, SignerResult } from '@polkadot/types/types';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockchainService } from '#blockchain/blockchain.service';
import { BadSignatureError, InsufficientBalanceError, MortalityError, NonceConflictError } from '#blockchain/types';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { TransactionData } from '#types/dtos/account';
import { ITxStatus } from '#account-lib/interfaces/tx-status.interface';
import { HexString } from '@polkadot/util/types';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import { TransactionType } from '#types/account-webhook';
import { Vec } from '@polkadot/types';
import { Call } from '@polkadot/types/interfaces';
import { getSignerForRawSignature } from '#utils/common/signature.util';
import workerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import { PinoLogger } from 'nestjs-pino';
import { BaseChainPublisherService } from '#consumer/base-chain-publisher.service';

const CAPACITY_EPOCH_TIMEOUT_NAME = 'capacity_check';

/**
 * Service responsible for publishing account updates.
 */
@Injectable()
@Processor(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
export class TransactionPublisherService extends BaseChainPublisherService {
  protected readonly capacityTimeoutName = CAPACITY_EPOCH_TIMEOUT_NAME;
  protected readonly workerConcurrencyConfigKey = `${QueueConstants.TRANSACTION_PUBLISH_QUEUE}QueueWorkerConcurrency`;

  constructor(
    @InjectRedis() cacheManager: Redis,
    @InjectQueue(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
    protected readonly queue: Queue,
    blockchainService: BlockchainService,
    schedulerRegistry: SchedulerRegistry,
    capacityCheckerService: CapacityCheckerService,
    @Inject(workerConfig.KEY)
    protected readonly workerConfig: IAccountWorkerConfig,
    logger: PinoLogger,
  ) {
    super(cacheManager, blockchainService, schedulerRegistry, capacityCheckerService, logger);
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
      this.logger.info(`Processing job ${job.id} of type ${job.name}.`);
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
      this.logger.debug(`Job completed (${job.id})`);
      this.logger.trace(JSON.stringify(job, null, 2));

      const status: ITxStatus = {
        type: job.data.type,
        referenceId: job.data.referenceId,
        providerId: job.data.providerId,
        txHash,
        successEvent: targetEvent,
        birth: tx.era.asMortalEra.birth(blockNumber),
        death: tx.era.asMortalEra.death(blockNumber),
      };
      await this.cacheTransactionStatus(txHash, status);
    } catch (error: any) {
      if (error instanceof DelayedError || TransactionPublisherService.shouldRetry(job, error)) {
        job.moveToDelayed(Date.now(), job.token);
      } else {
        this.logger.error(error, 'Unknown error encountered');
      }
      throw error;
    }
  }

  /**
   * Determine if job should be returned to the queue for retries.
   * (Default retry logic is "1"; ie only a single attempt. But some chain
   * submission errors deserve a retry; however, we don't want to retry indefinitely,
   * so we cap it at 4)
   * @param job The current job
   * @param err The error that was thrown
   * @returns Whether the job should be retried
   */
  public static shouldRetry(job: Job<any>, err: Error): boolean {
    if (
      job.attemptsStarted < 4 &&
      (err instanceof NonceConflictError ||
        err instanceof BadSignatureError ||
        err instanceof InsufficientBalanceError ||
        err instanceof MortalityError)
    ) {
      return true;
    }

    return false;
  }

  async processProxyTxn(
    ext: SubmittableExtrinsic<'promise', ISubmittableResult>,
    accountId: string,
    signature: HexString,
  ): Promise<[SubmittableExtrinsic<'promise'>, HexString, number]> {
    try {
      const prefixedSignature: SignerResult = { id: 1, signature };
      const signer: Signer = getSignerForRawSignature(prefixedSignature);
      const nonce = await this.blockchainService.getNextNonce(accountId);
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
}
