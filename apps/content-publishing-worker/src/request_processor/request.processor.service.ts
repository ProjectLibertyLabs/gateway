import { Processor } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DelayedError, Job } from 'bullmq';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { IRequestJob } from '#types/interfaces/content-publishing';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';
import { BaseConsumer } from '#consumer';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';
import workerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';
import { IpfsService } from '#storage';

@Injectable()
@Processor(QueueConstants.REQUEST_QUEUE_NAME)
export class RequestProcessorService extends BaseConsumer implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    this.worker.concurrency = this.config[`${this.worker.name}QueueWorkerConcurrency`] || 1;
  }

  constructor(
    private dsnpAnnouncementProcessor: DsnpAnnouncementProcessor,
    @Inject(workerConfig.KEY) private readonly config: IContentPublishingWorkerConfig,
    private ipfsService: IpfsService,
  ) {
    super();
  }

  async process(job: Job<IRequestJob, any, string>): Promise<any> {
    this.logger.info(`Processing job ${job.id} of type ${job.name}`);
    this.logger.debug(job.asJSON());
    try {
      const assets: string[] = job.data.assetToMimeType ? Object.keys(job.data.assetToMimeType) : [];
      const pinnedAssets = assets.map((cid) => this.ipfsService.getPinned(cid));
      const pinnedResult = await Promise.all(pinnedAssets);
      // if any of assets does not exist delay the job for a future attempt
      if (pinnedResult.some((buffer) => !buffer || buffer.length === 0)) {
        await this.delayJobAndIncrementAttempts(job);
      } else {
        await this.dsnpAnnouncementProcessor.collectAnnouncementAndQueue(job.data);
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private async delayJobAndIncrementAttempts(job: Job<IRequestJob, any, string>) {
    const { data } = job;
    data.dependencyAttempt += 1;
    if (data.dependencyAttempt <= 3) {
      // exponential backoff
      const delayedTime =
        2 ** data.dependencyAttempt * this.config.assetUploadVerificationDelaySeconds * MILLISECONDS_PER_SECOND;
      await job.moveToDelayed(Date.now() + delayedTime, job.token);
      await job.updateData(data);
      throw new DelayedError();
    } else {
      throw new Error('Dependency failed!');
    }
  }
}
