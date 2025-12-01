import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockchainService } from '#blockchain/blockchain.service';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { HcpPublishJob } from '#types/dtos/account';
import { IHcpTxStatus } from '#types/interfaces/tx-status.interface';
import { HexString } from '@polkadot/util/types';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import workerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import { PinoLogger } from 'nestjs-pino';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BasePublisherService } from '#queue';

const CAPACITY_EPOCH_TIMEOUT_NAME = 'hcp_capacity_check';

/**
 * Service responsible for publishing HCP batch transactions.
 */
@Injectable()
@Processor(QueueConstants.HCP_PUBLISH_QUEUE)
export class HcpPublisherService extends BasePublisherService {
  protected readonly capacityTimeoutName = CAPACITY_EPOCH_TIMEOUT_NAME;
  protected readonly workerConcurrencyKey = `${QueueConstants.HCP_PUBLISH_QUEUE}QueueWorkerConcurrency`;

  constructor(
    @InjectRedis() cacheManager: Redis,
    @InjectQueue(QueueConstants.HCP_PUBLISH_QUEUE) protected readonly queue: Queue,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    @Inject(workerConfig.KEY) protected readonly workerConfig: IAccountWorkerConfig,
    blockchainService: BlockchainService,
    capacityCheckerService: CapacityCheckerService,
    schedulerRegistry: SchedulerRegistry,
    logger: PinoLogger,
  ) {
    super(cacheManager, blockchainService, schedulerRegistry, capacityCheckerService, logger);
  }

  public async onApplicationShutdown(_signal?: string | undefined): Promise<void> {
    await this.queue.close();
    await super.onApplicationShutdown(_signal);
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
      // Check capacity first; if out of capacity, send job back to queue
      if (!(await this.capacityCheckerService.checkForSufficientCapacity())) {
        throw new DelayedError('Out of Capacity. Delaying HCP job ' + job.id);
      }
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

      await this.cacheTransactionStatus(payWithCapacityTxHash, status);
    } catch (error: unknown) {
      if (error instanceof DelayedError) {
        job.moveToDelayed(Date.now(), job.token);
      }
      this.logger.error(error);
      throw error;
    }
  }
}
