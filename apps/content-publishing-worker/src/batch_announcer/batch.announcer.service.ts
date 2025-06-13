import { Processor, InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BatchAnnouncer } from './batch.announcer';
import { BaseConsumer } from '#consumer';
import { ContentPublishingQueues as QueueConstants, CAPACITY_EPOCH_TIMEOUT_NAME } from '#types/constants';
import { IBatchAnnouncerJob, isExistingBatch } from '../interfaces';
import workerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';

@Injectable()
@Processor(QueueConstants.BATCH_QUEUE_NAME)
export class BatchAnnouncementService extends BaseConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  public onApplicationBootstrap() {
    this.worker.concurrency = this.cpWorkerConfig[`${this.worker.name}QueueWorkerConcurrency`] || 2;
  }

  constructor(
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    private ipfsPublisher: BatchAnnouncer,
    private schedulerRegistry: SchedulerRegistry,
    @Inject(workerConfig.KEY) private readonly cpWorkerConfig: IContentPublishingWorkerConfig,
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

  async process(job: Job<IBatchAnnouncerJob, any, string>): Promise<any> {
    this.logger.info(`Processing job ${job.id} of type ${job.name}`);
    try {
      const publisherJob = await (isExistingBatch(job.data)
        ? this.ipfsPublisher.announceExistingBatch(job.data)
        : this.ipfsPublisher.announce(job.data));
      // eslint-disable-next-line no-promise-executor-return
      await this.publishQueue.add(publisherJob.id, publisherJob, {
        jobId: publisherJob.id,
        removeOnComplete: 1000,
        attempts: 3,
      });
      this.logger.info(`Completed job ${job.id} of type ${job.name}`);
      return job.data;
    } catch (e: any) {
      this.logger.error(`Error processing job ${job.id} of type ${job.name}: ${e}`, e?.stack);
      throw e;
    }
  }
}
