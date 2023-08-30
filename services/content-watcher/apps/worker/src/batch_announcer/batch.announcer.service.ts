import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '../../../api/src/config/config.service';
import { IPFSAnnouncer } from './ipfs.announcer';
import { CAPACITY_EPOCH_TIMEOUT_NAME } from '../../../../libs/common/src/constants';
import { IBatchAnnouncerJobData } from '../interfaces/batch-announcer.job.interface';
import { QueueConstants } from '../../../../libs/common/src';

@Injectable()
@Processor(QueueConstants.BATCH_QUEUE_NAME, {
  concurrency: 2,
})
export class BatchAnnouncementService extends WorkerHost implements OnApplicationBootstrap, OnModuleDestroy {
  private logger: Logger;

  private capacityExhausted = false;

  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    private configService: ConfigService,
    private ipfsPublisher: IPFSAnnouncer,
    private schedulerRegistry: SchedulerRegistry,
    private eventEmitter: EventEmitter2,
  ) {
    super();
    this.logger = new Logger(this.constructor.name);
  }

  public async onApplicationBootstrap() {
    this.logger.log('onApplicationBootstrap');
  }

  public onModuleDestroy() {
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (e) {
      // 💀 //
    }
  }

  async process(job: Job<IBatchAnnouncerJobData, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      await this.ipfsPublisher.announce(job.data);
      this.logger.log(`Completed job ${job.id} of type ${job.name}`);
      return job.data;
    } catch (e) {
      this.logger.error(`Error processing job ${job.id} of type ${job.name}: ${e}`);
      throw e;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  @OnWorkerEvent('completed')
  onCompleted() {
    // do some stuff
  }
}
