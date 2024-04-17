import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { DelayedError, Job } from 'bullmq';
import Redis from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { IRequestJob, QueueConstants } from '../../../../libs/common/src';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';
import { BaseConsumer } from '../BaseConsumer';

@Injectable()
@Processor(QueueConstants.REQUEST_QUEUE_NAME)
export class RequestProcessorService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    private dsnpAnnouncementProcessor: DsnpAnnouncementProcessor,
    private configService: ConfigService,
    private ipfsService: IpfsService,
  ) {
    super();
  }

  async process(job: Job<IRequestJob, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
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
      const delayedTime = 2 ** data.dependencyAttempt * this.configService.assetUploadVerificationDelaySeconds * MILLISECONDS_PER_SECOND;
      await job.moveToDelayed(Date.now() + delayedTime, job.token);
      await job.update(data);
      throw new DelayedError();
    } else {
      throw new Error('Dependency failed!');
    }
  }
}
