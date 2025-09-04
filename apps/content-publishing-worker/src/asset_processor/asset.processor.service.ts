import { InjectRedis } from '@songkeys/nestjs-redis';
import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { IAssetJob } from '#types/interfaces/content-publishing';
import { ContentPublishingQueues as QueueConstants } from '#types/constants';
import { BaseConsumer } from '#consumer';
import workerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';
import { IpfsService } from '#storage';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
@Processor(QueueConstants.ASSET_QUEUE_NAME)
export class AssetProcessorService extends BaseConsumer implements OnApplicationBootstrap {
  public onApplicationBootstrap() {
    this.worker.concurrency = this.cpWorkerConfig[`${this.worker.name}QueueWorkerConcurrency`] || 1;
  }

  constructor(
    @InjectRedis() private redis: Redis,
    @Inject(workerConfig.KEY) private readonly config: IContentPublishingWorkerConfig,
    private ipfsService: IpfsService,
    @Inject(workerConfig.KEY) private readonly cpWorkerConfig: IContentPublishingWorkerConfig,
    protected readonly logger: PinoLogger,
  ) {
    super(logger);
  }

  async process(job: Job<IAssetJob, any, string>): Promise<void> {
    this.logger.info(`Processing job ${job.id} of type ${job.name}`);
    this.logger.debug(job.asJSON());
    const redisResults = await this.redis.getBuffer(job.data.contentLocation);
    if (!redisResults) {
      throw new Error(`Content stored in ${job.data.contentLocation} does not exist!`);
    }
    const pinned = await this.ipfsService.ipfsPin(job.data.mimeType, redisResults, false);
    this.logger.info(pinned);
    if (job.data.ipfsCid !== pinned.cid) {
      throw new Error(`Cid does not match ${job.data.ipfsCid} != ${pinned.cid}`);
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<IAssetJob, any, string>) {
    this.logger.info(`completed ${job.id}`);
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
