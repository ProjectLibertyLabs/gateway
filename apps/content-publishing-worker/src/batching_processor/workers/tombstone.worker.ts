import { Announcement } from '#types/interfaces/content-publishing';
import { ContentPublishingQueues as QueueConstants } from '#types/constants';
import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseConsumer } from '#consumer';
import { BatchingProcessorService } from '../batching.processor.service';
import workerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';

@Injectable()
@Processor(QueueConstants.TOMBSTONE_QUEUE_NAME, { concurrency: 2 })
export class TombstoneWorker extends BaseConsumer implements OnApplicationBootstrap {
  constructor(
    private batchingProcessorService: BatchingProcessorService,
    @Inject(workerConfig.KEY) private readonly cpWorkerConfig: IContentPublishingWorkerConfig,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    this.worker.concurrency = this.cpWorkerConfig[`${this.worker.name}QueueWorkerConcurrency`] || 2;
    return this.batchingProcessorService.setupActiveBatchTimeout(QueueConstants.TOMBSTONE_QUEUE_NAME);
  }

  async process(job: Job<Announcement, any, string>): Promise<any> {
    return this.batchingProcessorService.process(job, QueueConstants.TOMBSTONE_QUEUE_NAME);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<Announcement, any, string>) {
    await this.batchingProcessorService.onCompleted(job, QueueConstants.TOMBSTONE_QUEUE_NAME);
    // calling in the end for graceful shutdowns
    super.onCompleted(job);
  }
}
