import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DelayedError, Job } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '../../../api/src/config/config.service';
import { AnnouncementTypeDto, BroadcastDto, IRequestJob, ProfileDto, QueueConstants, ReplyDto, UpdateDto } from '../../../../libs/common/src';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';

@Injectable()
@Processor(QueueConstants.REQUEST_QUEUE_NAME)
export class RequestProcessorService extends WorkerHost {
  private logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    private configService: ConfigService,
    private ipfsService: IpfsService,
  ) {
    super();
    this.logger = new Logger(this.constructor.name);
  }

  async process(job: Job<IRequestJob, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    this.logger.debug(job.asJSON());
    const assets = this.getAssetReferencesFromRequestJob(job.data);

    const pinnedAssets = assets.map((cid) => this.ipfsService.getPinned(cid));
    const pinnedResult = await Promise.all(pinnedAssets);
    // if any of assets does not exists delay the job for a future attempt
    if (pinnedResult.some((buffer) => !buffer)) {
      await this.delayJobAndIncrementAttempts(job);
    } else {
      // TODO: create attachments from assets
    }
  }

  // eslint-disable-next-line class-methods-use-this
  @OnWorkerEvent('completed')
  onCompleted() {}

  // eslint-disable-next-line class-methods-use-this
  private getAssetReferencesFromRequestJob(job: IRequestJob): Array<string> {
    const assets: string[] = [];
    // eslint-disable-next-line default-case
    switch (job.announcementType) {
      case AnnouncementTypeDto.BROADCAST:
        (job.content as BroadcastDto).content.assets?.forEach((a) => a.references?.forEach((r) => assets.push(r.referenceId)));
        break;
      case AnnouncementTypeDto.REPLY:
        (job.content as ReplyDto).content.assets?.forEach((a) => a.references?.forEach((r) => assets.push(r.referenceId)));
        break;
      case AnnouncementTypeDto.UPDATE:
        (job.content as UpdateDto).content.assets?.forEach((a) => a.references?.forEach((r) => assets.push(r.referenceId)));
        break;
      case AnnouncementTypeDto.PROFILE:
        (job.content as ProfileDto).profile.icon?.forEach((r) => assets.push(r.referenceId));
    }
    return assets;
  }

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
