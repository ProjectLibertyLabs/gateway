import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { AnnouncementTypeDto, BroadcastDto, IRequestJob, ProfileDto, QueueConstants, ReplyDto, UpdateDto } from '../../../../libs/common/src';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';

@Injectable()
@Processor(QueueConstants.REQUEST_QUEUE_NAME)
export class RequestProcessorService extends WorkerHost {
  private logger: Logger;

  constructor(
    @InjectRedis() private cacheManager: Redis,
    private dsnpAnnouncementProcessor: DsnpAnnouncementProcessor,
    private configService: ConfigService,
    private ipfsService: IpfsService,
  ) {
    super();
    this.logger = new Logger(this.constructor.name);
  }

  async process(job: Job<IRequestJob, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    this.logger.debug(job.asJSON());
    try {
      const assets: string[] = job.data.assetToMimeType ? Object.keys(job.data.assetToMimeType) : [];
      const pinnedAssets = assets.map((cid) => this.ipfsService.getPinned(cid));
      const pinnedResult = await Promise.all(pinnedAssets);
      // if any of assets does not exists delay the job for a future attempt
      if (pinnedResult.some((buffer) => !buffer)) {
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
  @OnWorkerEvent('completed')
  onCompleted() {}

  // eslint-disable-next-line class-methods-use-this
  private async delayJobAndIncrementAttempts(job: Job<IRequestJob, any, string>) {
    const { data } = job;
    data.dependencyAttempt += 1;
    if (data.dependencyAttempt <= 3) {
      // attempts 10 seconds, 20 seconds, 40 seconds
      const delayedTime = 2 ** data.dependencyAttempt * 5 * 1000;
      await job.moveToDelayed(Date.now() + delayedTime, job.token); // TODO: get from config
      await job.update(data);
      throw new DelayedError();
    } else {
      throw new Error('Dependency failed!');
    }
  }
}
