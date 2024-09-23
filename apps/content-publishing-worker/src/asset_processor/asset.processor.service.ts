import { InjectRedis } from '@songkeys/nestjs-redis';
import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { IAssetJob } from '#types/interfaces/content-publishing';
import { ContentPublishingQueues as QueueConstants } from '#types/constants';
import { IpfsService } from '#content-publishing-lib/utils/ipfs.client';
import { BaseConsumer } from '../BaseConsumer';
import workerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';

@Injectable()
@Processor(QueueConstants.ASSET_QUEUE_NAME)
export class AssetProcessorService extends BaseConsumer {
  constructor(
    @InjectRedis() private redis: Redis,
    @Inject(workerConfig.KEY) private readonly config: IContentPublishingWorkerConfig,
    private ipfsService: IpfsService,
  ) {
    super();
  }

  async process(job: Job<IAssetJob, any, string>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    this.logger.debug(job.asJSON());
    const redisResults = await this.redis.getBuffer(job.data.contentLocation);
    if (!redisResults) {
      throw new Error(`Content stored in ${job.data.contentLocation} does not exist!`);
    }
    const pinned = await this.ipfsService.ipfsPin(job.data.mimeType, redisResults, false);
    this.logger.log(pinned);
    if (job.data.ipfsCid !== pinned.cid) {
      throw new Error(`Cid does not match ${job.data.ipfsCid} != ${pinned.cid}`);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  @OnWorkerEvent('completed')
  async onCompleted(job: Job<IAssetJob, any, string>) {
    this.logger.log(`completed ${job.id}`);
    const secondsPassed = Math.round((Date.now() - job.timestamp) / 1000);
    const expectedSecondsToExpire = this.config.assetExpirationIntervalSeconds;
    const secondsToExpire = Math.max(0, expectedSecondsToExpire - secondsPassed);
    const result = await this.redis
      .pipeline()
      .expire(job.data.contentLocation, secondsToExpire, 'LT')
      .expire(job.data.metadataLocation, secondsToExpire, 'LT')
      .exec();
    this.logger.debug(result);
    // calling in the end for graceful shutdowns
    super.onCompleted(job);
  }
}
