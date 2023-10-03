import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { BatchAnnouncer } from './batch.announcer';
import { CAPACITY_EPOCH_TIMEOUT_NAME } from '../../../../libs/common/src/constants';
import { IBatchAnnouncerJobData } from '../interfaces/batch-announcer.job.interface';
import { QueueConstants } from '../../../../libs/common/src';
import { BaseConsumer } from '../BaseConsumer';

@Injectable()
@Processor(QueueConstants.BATCH_QUEUE_NAME, {
  concurrency: 2,
})
export class BatchAnnouncementService extends BaseConsumer implements OnModuleDestroy {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    private configService: ConfigService,
    private ipfsPublisher: BatchAnnouncer,
    private schedulerRegistry: SchedulerRegistry,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async onModuleDestroy(): Promise<any> {
    try {
      this.schedulerRegistry.deleteTimeout(CAPACITY_EPOCH_TIMEOUT_NAME);
    } catch (e) {
      // 💀 //
    }
    // calling in the end for graceful shutdowns
    await super.onModuleDestroy();
  }

  async process(job: Job<IBatchAnnouncerJobData, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      const publisherJob = await this.ipfsPublisher.announce(job.data);
      // eslint-disable-next-line no-promise-executor-return
      await this.publishQueue.add(publisherJob.id, publisherJob, { jobId: publisherJob.id, removeOnComplete: 1000 });
      this.logger.log(`Completed job ${job.id} of type ${job.name}`);
      return job.data;
    } catch (e) {
      this.logger.error(`Error processing job ${job.id} of type ${job.name}: ${e}`);
      throw e;
    }
  }
}
