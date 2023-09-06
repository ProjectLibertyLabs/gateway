import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '../../../api/src/config/config.service';
import { QueueConstants } from '../../../../libs/common/src';
import { IAssetJob } from '../../../../libs/common/src/interfaces/asset-job.interface';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';

@Injectable()
@Processor(QueueConstants.ASSET_QUEUE_NAME)
export class AssetProcessorService extends WorkerHost {
  private logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    private configService: ConfigService,
    private ipfsService: IpfsService,
  ) {
    super();
    this.logger = new Logger(this.constructor.name);
  }

  async process(job: Job<IAssetJob, any, string>): Promise<any> {
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
    const expectedSecondsToExpire = 5 * 60; // TODO: get from config
    const secondsToExpire = Math.max(0, expectedSecondsToExpire - secondsPassed);
    const result = await this.redis.pipeline().expire(job.data.contentLocation, secondsToExpire, 'LT').expire(job.data.metadataLocation, secondsToExpire, 'LT').exec();
    this.logger.debug(result);
  }
}
