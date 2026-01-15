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
import { IIcsTxStatus } from '#types/interfaces/tx-status.interface';
import { HexString } from '@polkadot/util/types';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import workerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import { PinoLogger } from 'nestjs-pino';
import { IcsPublishJob } from '#types/interfaces';
import { BaseChainPublisherService } from '#consumer/base-chain-publisher.service';

const CAPACITY_EPOCH_TIMEOUT_NAME = 'ics_capacity_check';

/**
 * Service responsible for publishing ICS batch transactions.
 */
@Injectable()
@Processor(QueueConstants.ICS_PUBLISH_QUEUE)
export class IcsPublisherService extends BaseChainPublisherService {
  protected readonly capacityTimeoutName = CAPACITY_EPOCH_TIMEOUT_NAME;
  protected readonly workerConcurrencyConfigKey = `${QueueConstants.ICS_PUBLISH_QUEUE}QueueWorkerConcurrency`;

  constructor(
    @InjectRedis() cacheManager: Redis,
    @InjectQueue(QueueConstants.ICS_PUBLISH_QUEUE) protected readonly queue: Queue,
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
   * Processes a job for ICS batch publishing.
   * @param job - The job to process.
   * @returns A promise that resolves when the job is processed.
   */
  async process(job: Job<IcsPublishJob, any, string>): Promise<void> {
    let payWithCapacityTxHash: HexString;
    let payWithCapacityTx: SubmittableExtrinsic<'promise', ISubmittableResult>;
    const successSection = 'utility';
    const successMethod = 'BatchCompleted';

    try {
      this.logger.info(`Processing ICS job ${job.id}`);
      // Check capacity first; if out of capacity, send job back to queue; this is an artificial delay
      if (!(await this.capacityCheckerService.checkForSufficientCapacity())) {
        throw new DelayedError('Out of Capacity. Delaying ICS job ' + job.id);
      }
      let blockNumber: number;

      // Decode the encoded extrinsics
      const txns = job.data.encodedExtrinsics.map((encoded) => this.blockchainService.createTxFromEncoded(encoded));

      // Create a Vec<Call> from the transactions
      const callVec = this.blockchainService.createType('Vec<Call>', txns);

      // Process the batch transaction
      [payWithCapacityTx, payWithCapacityTxHash, blockNumber] = await this.processBatchTxn(callVec);

      this.logger.debug(`Successful job: ${JSON.stringify(job, null, 2)}`);

      const status: IIcsTxStatus = {
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
