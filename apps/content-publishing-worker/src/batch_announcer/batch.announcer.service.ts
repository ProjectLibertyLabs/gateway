import { Processor, InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BatchAnnouncer } from './batch.announcer';
import { BaseConsumer } from '../BaseConsumer';
import { ContentPublishingQueues as QueueConstants, CAPACITY_EPOCH_TIMEOUT_NAME } from '#types/constants';
import { IBatchAnnouncerJobData } from '../interfaces';

@Injectable()
@Processor(QueueConstants.BATCH_QUEUE_NAME, {
  concurrency: 2,
})
export class BatchAnnouncementService extends BaseConsumer implements OnModuleDestroy {
  constructor(
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    private ipfsPublisher: BatchAnnouncer,
    private schedulerRegistry: SchedulerRegistry,
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
      await this.publishQueue.add(publisherJob.id, publisherJob, {
        jobId: publisherJob.id,
        removeOnComplete: 1000,
        attempts: 3,
      });
      this.logger.log(`Completed job ${job.id} of type ${job.name}`);
      return job.data;
    } catch (e: any) {
      this.logger.error(`Error processing job ${job.id} of type ${job.name}: ${e}`, e?.stack);
      throw e;
    }
  }
}
