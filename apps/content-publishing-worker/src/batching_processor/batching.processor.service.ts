import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { SchedulerRegistry } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import {
  getBatchMetadataKey,
  getBatchDataKey,
  getLockKey as getBatchLockKey,
  BATCH_LOCK_EXPIRE_SECONDS,
} from '#content-publishing-lib/utils/redis';
import { BATCH_QUEUE_NAME, QUEUE_NAME_TO_ANNOUNCEMENT_MAP } from '#types/constants';
import { ConfigService } from '#content-publishing-lib/config';
import { Announcement, IBatchMetadata } from '#types/interfaces/content-publishing';
import { IBatchAnnouncerJobData } from '../interfaces';
import { BlockchainService } from '#content-publishing-lib/blockchain/blockchain.service';

@Injectable()
export class BatchingProcessorService {
  private logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(BATCH_QUEUE_NAME) private outputQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
    redis.defineCommand('addToBatch', {
      numberOfKeys: 2,
      lua: fs.readFileSync('lua/addToBatch.lua', 'utf8'),
    });
    redis.defineCommand('lockBatch', {
      numberOfKeys: 4,
      lua: fs.readFileSync('lua/lockBatch.lua', 'utf8'),
    });
  }

  async setupActiveBatchTimeout(queueName: string) {
    const metadata = await this.getMetadataFromRedis(queueName);
    if (metadata) {
      const openTimeMs = Math.round(Date.now() - metadata.startTimestamp);
      const batchTimeoutInMs = this.configService.batchIntervalSeconds * MILLISECONDS_PER_SECOND;
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

    const batchId = randomUUID().toString();
    const newMetadata = JSON.stringify({
      batchId,
      startTimestamp: Date.now(),
      rowCount: 1,
    } as IBatchMetadata);
    const newData = JSON.stringify(job.data);

    // @ts-expect-error addToBatch is a custom command
    const rowCount = await this.redis.addToBatch(
      getBatchMetadataKey(queueName),
      getBatchDataKey(queueName),
      newMetadata,
      job.id!,
      newData,
    );
    this.logger.log(rowCount);
    if (rowCount === 1) {
      this.logger.log(`Processing job ${job.id} with a new batch`);
      const timeout = this.configService.batchIntervalSeconds * MILLISECONDS_PER_SECOND;
      this.addBatchTimeout(queueName, batchId, timeout);
    } else if (rowCount >= this.configService.batchMaxCount) {
      await this.closeBatch(queueName, batchId, false);
    } else if (rowCount === -1) {
      throw new Error(
        `invalid result from addingToBatch for job ${job.id} and queue ${queueName} ${this.configService.batchMaxCount}`,
      );
    }
  }

  async onCompleted(job: Job<Announcement, any, string>, queueName: string) {
    this.logger.log(`Completed ${job.id} from ${queueName}`);
  }

  private async closeBatch(queueName: string, batchId: string, timeout: boolean) {
    this.logger.log(`Closing batch for ${queueName} ${batchId} ${timeout}`);

    const batchMetaDataKey = getBatchMetadataKey(queueName);
    const batchDataKey = getBatchDataKey(queueName);
    const lockedBatchMetaDataKey = getBatchLockKey(batchMetaDataKey);
    const lockedBatchDataKey = getBatchLockKey(batchDataKey);
    // @ts-expect-error lockBatch is a custom command
    const response = await this.redis.lockBatch(
      batchMetaDataKey,
      batchDataKey,
      lockedBatchMetaDataKey,
      lockedBatchDataKey,
      Date.now(),
      BATCH_LOCK_EXPIRE_SECONDS * 1000,
    );
    this.logger.debug(JSON.stringify(response));
    const status = response[0];

    if (status === 0) {
      this.logger.log(`No meta-data for closing batch ${queueName} ${batchId}. Ignore...`);
      return;
    }
    if (status === -2) {
      this.logger.log(`Previous batch is still locked ${queueName}. Ignore...`);
      return;
    }
    if (status === -1) {
      this.logger.log(`Previous batch is not closed for ${queueName} and we are going to close it first`);
    }
    const batch = response[1];
    const metaData: IBatchMetadata = JSON.parse(response[2]);
    const announcements: Announcement[] = [];
    for (let i = 0; i < batch.length; i += 2) {
      const announcement: Announcement = JSON.parse(batch[i + 1]);
      announcements.push(announcement);
    }
    if (announcements.length > 0) {
      const job = {
        batchId: metaData.batchId,
        schemaId: await this.blockchainService.getSchemaIdByName(
          'dsnp',
          QUEUE_NAME_TO_ANNOUNCEMENT_MAP.get(queueName)!.toString(),
        ),
        announcements,
      } as IBatchAnnouncerJobData;
      await this.outputQueue.add(`Batch Job - ${metaData.batchId}`, job, {
        jobId: metaData.batchId,
        removeOnFail: false,
        removeOnComplete: 1000,
      });
    }
    try {
      const result = await this.redis.multi().del(lockedBatchMetaDataKey).del(lockedBatchDataKey).exec();
      this.logger.debug(result);
      const timeoutName = BatchingProcessorService.getTimeoutName(queueName, batchId);
      if (this.schedulerRegistry.doesExist('timeout', timeoutName)) {
        this.schedulerRegistry.deleteTimeout(timeoutName);
      }
    } catch (e) {
      this.logger.error(e);
    }
    if (status === -1) {
      this.logger.log(`after closing the previous leftover locked batch now we are going to close ${queueName}`);
      await this.closeBatch(queueName, batchId, timeout);
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
    const timeoutName = BatchingProcessorService.getTimeoutName(queueName, batchId);
    if (this.schedulerRegistry.doesExist('timeout', timeoutName)) {
      this.schedulerRegistry.deleteTimeout(timeoutName);
    }
    this.schedulerRegistry.addTimeout(timeoutName, timeoutHandler);
  }
}
