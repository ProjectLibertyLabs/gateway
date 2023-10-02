import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueConstants } from '../../../../../libs/common/src';
import { BatchingProcessorService } from '../batching.processor.service';
import { Announcement } from '../../../../../libs/common/src/interfaces/dsnp';
import { BaseConsumer } from '../../BaseConsumer';

@Injectable()
@Processor(QueueConstants.UPDATE_QUEUE_NAME, { concurrency: 2 })
export class UpdateWorker extends BaseConsumer implements OnApplicationBootstrap {
  constructor(private batchingProcessorService: BatchingProcessorService) {
    super();
  }

  async onApplicationBootstrap() {
    return this.batchingProcessorService.setupActiveBatchTimeout(QueueConstants.UPDATE_QUEUE_NAME);
  }

  async process(job: Job<Announcement, any, string>): Promise<any> {
    return this.batchingProcessorService.process(job, QueueConstants.UPDATE_QUEUE_NAME);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<Announcement, any, string>) {
    await this.batchingProcessorService.onCompleted(job, QueueConstants.UPDATE_QUEUE_NAME);
    // calling in the end for graceful shutdowns
    super.onCompleted(job);
  }
}
