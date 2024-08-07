import { InjectRedis } from '@songkeys/nestjs-redis';
import { Processor, InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { ConfigService } from '#libs/config';
import { BlockchainService } from '#libs/blockchain/blockchain.service';
import { CAPACITY_EPOCH_TIMEOUT_NAME, SECONDS_PER_BLOCK, TXN_WATCH_LIST_KEY } from '#libs/constants';
import { PUBLISH_QUEUE_NAME } from '#libs/queues/queue.constants';
import { BaseConsumer } from '../BaseConsumer';
import { IPublisherJob } from '../interfaces';
import { IPFSPublisher } from './ipfs.publisher';
import { ITxStatus } from '#libs/interfaces/tx-status.interface';
import { CapacityCheckerService } from '#libs/blockchain/capacity-checker.service';

@Injectable()
@Processor(PUBLISH_QUEUE_NAME, {
  concurrency: 2,
})
export class PublishingService extends BaseConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
    private ipfsPublisher: IPFSPublisher,
    private schedulerRegistry: SchedulerRegistry,
    private eventEmitter: EventEmitter2,
    private capacityCheckerService: CapacityCheckerService,
  ) {
    super();
  }

  public async onApplicationBootstrap() {
    await this.capacityCheckerService.checkCapacity();
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
      // Check capacity first; if out of capacity, send job back to queue
      if (!(await this.capacityCheckerService.checkCapacity())) {
        job.moveToDelayed(Date.now(), job.token); // fake delay, we just want to avoid processing the current job if we're out of capacity
        throw new DelayedError();
      }
      this.logger.log(`Processing job ${job.id} of type ${job.name}`);
      const currentBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      const [txHash, tx] = await this.ipfsPublisher.publish(job.data);

      const status: ITxStatus = {
        txHash: txHash.toString(),
        successEvent: { section: 'messages', method: 'MessagesInBlock' },
        birth: tx.era.asMortalEra.birth(currentBlockNumber),
        death: tx.era.asMortalEra.death(currentBlockNumber),
        referencePublishJob: job.data,
      };
      const obj = {};
      obj[txHash.toString()] = JSON.stringify(status);
      await this.cacheManager.hset(TXN_WATCH_LIST_KEY, obj);
      this.logger.verbose(`Successfully completed job ${job.id}`);
    } catch (e) {
      if (!(e instanceof DelayedError)) {
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
    const { capacityLimitObj } = this.configService;
    const capacity = await this.blockchainService.capacityInfo(this.configService.providerId);

    this.logger.debug(`
    Capacity limit: ${JSON.stringify(capacityLimitObj)}
    Remaining Capacity: ${JSON.stringify(capacity.remainingCapacity.toString())})}`);

    const blocksRemaining = capacity.nextEpochStart - capacity.currentBlockNumber;
    try {
      this.schedulerRegistry.addTimeout(
        CAPACITY_EPOCH_TIMEOUT_NAME,
        setTimeout(() => this.capacityCheckerService.checkCapacity(), blocksRemaining * SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND),
      );
    } catch (err) {
      // ignore duplicate timeout
    }
  }

  @OnEvent('capacity.available', { async: true, promisify: true })
  private async handleCapacityRefilled() {
    this.logger.debug('Received capacity.refilled event');
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (err) {
      // ignore
    }
  }
}
