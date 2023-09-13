import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { SchedulerRegistry } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { Announcement } from '../../../../libs/common/src/interfaces/dsnp';
import { RedisUtils } from '../../../../libs/common/src/utils/redis';
import { IBatchMetadata } from '../../../../libs/common/src/interfaces/batch.interface';
import getBatchMetadataKey = RedisUtils.getBatchMetadataKey;
import getBatchDataKey = RedisUtils.getBatchDataKey;
import { IBatchAnnouncerJobData } from '../interfaces/batch-announcer.job.interface';
import { DsnpSchemas } from '../../../../libs/common/src/utils/dsnp.schema';
import { QueueConstants } from '../../../../libs/common/src';

@Injectable()
export class BatchingProcessorService {
  private logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.BATCH_QUEUE_NAME) private outputQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async setupActiveBatchTimeout(queueName: string) {
    const metadata = await this.getMetadataFromRedis(queueName);
    if (metadata) {
      const openTimeMs = Math.round(Date.now() - metadata.startTimestamp);
      const batchTimeoutInMs = 12 * 1000; // TODO: get from config
      if (openTimeMs >= batchTimeoutInMs) {
        await this.closeBatch(queueName, metadata.batchId, false);
      } else {
        const remainingTimeMs = batchTimeoutInMs - openTimeMs;
        this.addBatchTimeout(queueName, metadata.batchId, remainingTimeMs);
      }
    }
  }

  async process(job: Job<Announcement, any, string>, queueName: string): Promise<any> {
    this.logger.log(`Processing job ${job.id} from ${queueName}`);

    const currentBatchMetadata = await this.getMetadataFromRedis(queueName);
    if (!currentBatchMetadata) {
      this.logger.log(`Processing job ${job.id} no current batch`);
      // No active batch exists, creating a new one
      const metadata = {
        batchId: randomUUID().toString(),
        startTimestamp: Date.now(),
        rowCount: 1,
      } as IBatchMetadata;
      const result = await this.redis
        .multi()
        .set(getBatchMetadataKey(queueName), JSON.stringify(metadata))
        .hsetnx(getBatchDataKey(queueName), job.id!, JSON.stringify(job.data))
        .exec();
      this.logger.debug(result);

      const timeout = 12 * 1000; // TODO: get from config
      this.addBatchTimeout(queueName, metadata.batchId, timeout);
    } else {
      // continue on active batch
      this.logger.log(`Processing job ${job.id} existing batch ${currentBatchMetadata.batchId}`);

      currentBatchMetadata.rowCount += 1;
      const result = await this.redis
        .multi()
        .set(getBatchMetadataKey(queueName), JSON.stringify(currentBatchMetadata))
        .hsetnx(getBatchDataKey(queueName), job.id!, JSON.stringify(job.data))
        .exec();
      this.logger.debug(result);

      // TODO: get from config
      if (currentBatchMetadata.rowCount >= 100) {
        await this.closeBatch(queueName, currentBatchMetadata.batchId, false);
      }
    }
  }

  async onCompleted(job: Job<Announcement, any, string>, queueName: string) {
    this.logger.log(`Completed ${job.id} from ${queueName}`);
  }

  private async closeBatch(queueName: string, batchId: string, timeout: boolean) {
    this.logger.log(`Closing batch for ${queueName} ${batchId} ${timeout}`);
    const metadata = await this.getMetadataFromRedis(queueName);
    const batch = await this.redis.hgetall(getBatchDataKey(queueName));
    const announcements: Announcement[] = [];
    Object.keys(batch).forEach((key) => {
      const announcement: Announcement = JSON.parse(batch[key]);
      announcements.push(announcement);
    });
    const job = {
      batchId,
      schemaId: DsnpSchemas.getSchemaId(this.configService.environment, QueueConstants.QUEUE_NAME_TO_ANNOUNCEMENT_MAP.get(queueName)!),
      announcements,
    } as IBatchAnnouncerJobData;
    await this.outputQueue.add(`Batch Job - ${metadata?.batchId}`, job, { jobId: metadata?.batchId, removeOnFail: false, removeOnComplete: 100 });
    this.logger.debug(batch);
    try {
      const result = await this.redis.multi().del(getBatchMetadataKey(queueName)).del(getBatchDataKey(queueName)).exec();
      this.logger.debug(result);
      const timeoutName = BatchingProcessorService.getTimeoutName(queueName, batchId);
      if (this.schedulerRegistry.doesExist('timeout', timeoutName)) {
        this.schedulerRegistry.deleteTimeout(timeoutName);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async getMetadataFromRedis(queueName: string): Promise<IBatchMetadata | undefined> {
    const batchMetadata = await this.redis.get(getBatchMetadataKey(queueName));
    return batchMetadata ? JSON.parse(batchMetadata) : undefined;
  }

  // eslint-disable-next-line class-methods-use-this
  private static getTimeoutName(queueName: string, batchId: string): string {
    return `TIMEOUT:${queueName}:${batchId}`;
  }

  private addBatchTimeout(queueName: string, batchId: string, timeoutMs: number) {
    const timeoutHandler = setTimeout(async () => this.closeBatch(queueName, batchId, true), timeoutMs);
    this.schedulerRegistry.addTimeout(BatchingProcessorService.getTimeoutName(queueName, batchId), timeoutHandler);
  }
}
