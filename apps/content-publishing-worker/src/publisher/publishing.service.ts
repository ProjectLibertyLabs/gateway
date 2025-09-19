import { InjectRedis } from '@songkeys/nestjs-redis';
import { Processor, InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DelayedError, Job, Queue, UnrecoverableError } from 'bullmq';
import Redis from 'ioredis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { BlockchainService } from '#blockchain/blockchain.service';
import {
  ContentPublishingQueues as QueueConstants,
  CAPACITY_EPOCH_TIMEOUT_NAME,
  SECONDS_PER_BLOCK,
  TXN_WATCH_LIST_KEY,
} from '#types/constants';
import { BaseConsumer } from '#consumer';
import { MessagePublisher } from './message.publisher';
import { IContentTxStatus, IPublisherJob, isOnChainJob } from '#types/interfaces';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import workerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
@Processor(QueueConstants.PUBLISH_QUEUE_NAME)
export class PublishingService extends BaseConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainService,
    private messagePublisher: MessagePublisher,
    private schedulerRegistry: SchedulerRegistry,
    private eventEmitter: EventEmitter2,
    private capacityCheckerService: CapacityCheckerService,
    @Inject(workerConfig.KEY) private readonly cpWorkerConfig: IContentPublishingWorkerConfig,
    protected readonly logger: PinoLogger,
  ) {
    super(logger);
  }

  public async onApplicationBootstrap() {
    await this.blockchainService.isReady();
    this.worker.concurrency = this.cpWorkerConfig[`${this.worker.name}QueueWorkerConcurrency`] || 2;
    await this.capacityCheckerService.checkForSufficientCapacity();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (e) {
      // 💀 //
    }
    // calling in the end for graceful shutdowns
    await super.onModuleDestroy();
  }

  async process(job: Job<IPublisherJob, any, string>): Promise<void> {
    try {
      const { data: jobData } = job;
      // Check capacity first; if out of capacity, send job back to queue
      if (!(await this.capacityCheckerService.checkForSufficientCapacity())) {
        throw new DelayedError();
      }
      this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

      // Check for valid delegation if appropriate (chain would reject anyway, but this saves Capacity)
      if (isOnChainJob(jobData) && typeof jobData.data.onBehalfOf !== 'undefined') {
        const isDelegationValid = await this.blockchainService.checkCurrentDelegation(
          jobData.data.onBehalfOf,
          jobData.schemaId,
          this.blockchainConf.providerId,
        );
        if (!isDelegationValid) {
          throw new UnrecoverableError('No valid delegation for schema');
        }
      }

      // The messagePublisher.publish handles batching internally
      const [tx, txHash, currentBlockNumber] = await this.messagePublisher.publish(jobData);

      // Store transaction status
      const status: IContentTxStatus = {
        txHash: txHash as `0x${string}`,
        successEvent: { section: 'messages', method: 'MessagesInBlock' },
        birth: tx.era.asMortalEra.birth(currentBlockNumber),
        death: tx.era.asMortalEra.death(currentBlockNumber),
        referencePublishJob: jobData,
      };

      // Store in Redis with the transaction hash as the key
      const obj = {};
      obj[txHash.toString()] = JSON.stringify(status);
      await this.cacheManager.hset(TXN_WATCH_LIST_KEY, obj);

      this.logger.debug(`Successfully completed job ${job.id}`);
    } catch (e) {
      if (e instanceof DelayedError) {
        job.moveToDelayed(Date.now(), job.token);
      } else {
        this.logger.error(`Job ${job.id} failed (attempts=${job.attemptsMade})error: ${e}`);
      }
      if (e instanceof Error && e.message.includes('Inability to pay some fees')) {
        this.eventEmitter.emit('capacity.exhausted');
      }
      throw e;
    }
  }

  @OnEvent('capacity.exhausted', { async: true, promisify: true })
  private async handleCapacityExhausted() {
    this.logger.debug('Received capacity.exhausted event');
    await this.publishQueue.pause();
    const { capacityLimit, providerId } = this.blockchainConf;
    const capacity = await this.blockchainService.capacityInfo(providerId.toString());

    this.logger.debug(`
    Capacity limit: ${JSON.stringify(capacityLimit)}
    Remaining Capacity: ${JSON.stringify(capacity.remainingCapacity.toString())})}`);

    const blocksRemaining = capacity.nextEpochStart - capacity.currentBlockNumber;
    try {
      this.schedulerRegistry.addTimeout(
        CAPACITY_EPOCH_TIMEOUT_NAME,
        setTimeout(
          () => this.capacityCheckerService.checkForSufficientCapacity(),
          blocksRemaining * SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND,
        ),
      );
    } catch (_err) {
      // ignore duplicate timeout
    }
  }

  @OnEvent('capacity.available', { async: true, promisify: true })
  private async handleCapacityRefilled() {
    // Avoid spamming the log
    if (await this.publishQueue.isPaused()) {
      this.logger.debug('Received capacity.available event');
    }
    await this.publishQueue.resume();
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (_err) {
      // ignore
    }
  }
}
