import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueConstants } from '../../../../../libs/common/src';
import { BatchingProcessorService } from '../batching.processor.service';
import { Announcement } from '../../../../../libs/common/src/interfaces/dsnp';

@Injectable()
@Processor(QueueConstants.PROFILE_QUEUE_NAME, { concurrency: 2 })
export class ProfileWorker extends WorkerHost implements OnApplicationBootstrap {
  private logger: Logger;

  constructor(private batchingProcessorService: BatchingProcessorService) {
    super();
    this.logger = new Logger(this.constructor.name);
  }

  async onApplicationBootstrap() {
    return this.batchingProcessorService.setupActiveBatchTimeout(QueueConstants.PROFILE_QUEUE_NAME);
  }

  async process(job: Job<Announcement, any, string>): Promise<any> {
    return this.batchingProcessorService.process(job, QueueConstants.PROFILE_QUEUE_NAME);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<Announcement, any, string>) {
    await this.batchingProcessorService.onCompleted(job, QueueConstants.PROFILE_QUEUE_NAME);
  }
}
