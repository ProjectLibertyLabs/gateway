import { Inject, Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { hexToString } from '@polkadot/util';
import parquet from '@dsnp/parquetjs';
import { calculateJobId } from '#types/constants';
import { ContentWatcherQueues as QueueConstants } from '#types/constants/queue.constants';
import { IIPFSJob } from '#types/interfaces/content-watcher/ipfs.job.interface';
import { BaseConsumer } from '#consumer';
import { AnnouncementResponse } from '#types/content-announcement';
import {
  isBroadcast,
  isProfile,
  isReaction,
  isReply,
  isTombstone,
  isUpdate,
} from '#content-watcher-lib/utils/type-guards';
import scannerConfig, { IScannerConfig } from '#content-watcher-lib/scanner/scanner.config';
import { IpfsService } from '#storage/ipfs/ipfs.service';

@Injectable()
@Processor(QueueConstants.WATCHER_IPFS_QUEUE, {
  concurrency: 2,
})
export class IPFSContentProcessor extends BaseConsumer {
  constructor(
    @InjectQueue(QueueConstants.WATCHER_BROADCAST_QUEUE_NAME) private broadcastQueue: Queue,
    @InjectQueue(QueueConstants.WATCHER_TOMBSTONE_QUEUE_NAME) private tombstoneQueue: Queue,
    @InjectQueue(QueueConstants.WATCHER_REACTION_QUEUE_NAME) private reactionQueue: Queue,
    @InjectQueue(QueueConstants.WATCHER_REPLY_QUEUE_NAME) private replyQueue: Queue,
    @InjectQueue(QueueConstants.WATCHER_PROFILE_QUEUE_NAME) private profileQueue: Queue,
    @InjectQueue(QueueConstants.WATCHER_UPDATE_QUEUE_NAME) private updateQueue: Queue,
    @Inject(scannerConfig.KEY) private config: IScannerConfig,
    private ipfsService: IpfsService,
  ) {
    super();
  }

  async process(job: Job<IIPFSJob, any, string>): Promise<any> {
    try {
      this.logger.log(`IPFS Processing job ${job.id}`);
      if (!job.data.cid) {
        this.logger.error(`IPFS Job ${job.id} failed with no CID`);
        return;
      }
      const cidStr = hexToString(job.data.cid);
      const contentBuffer = await this.ipfsService.getPinned(cidStr, true);

      if (contentBuffer.byteLength === 0) {
        this.logger.log(`IPFS Job ${job.id} completed with no content`);
        return;
      }

      const reader = await parquet.ParquetReader.openBuffer(contentBuffer);
      const cursor = reader.getCursor();
      const records: any[] = [];
      let record = await cursor.next();
      while (record) {
        records.push(record);
        // eslint-disable-next-line no-await-in-loop
        record = await cursor.next();
      }

      await this.buildAndQueueDSNPAnnouncements(records, job.data);

      this.logger.log(`IPFS Job ${job.id} completed`);
    } catch (e) {
      this.logger.error(`IPFS Job ${job.id} failed with error: ${e}`);
      throw e;
    }
  }

  private async enqueueAnnouncementResponse(
    announcementResponse: AnnouncementResponse,
    name: string,
    queue: Queue,
  ): Promise<void> {
    if (!(await this.isQueueFull(queue))) {
      const jobId = calculateJobId(announcementResponse);
      await queue.add(name, announcementResponse, { jobId });
    }
  }

  private async buildAndQueueDSNPAnnouncements(records: any[], jobData: IIPFSJob): Promise<void> {
    const { blockNumber, requestId, schemaId, webhookUrl } = jobData;
    records.forEach(async (mapRecord) => {
      let queue: Queue;
      let typeName: string;
      const announcementResponse = {
        blockNumber,
        requestId,
        schemaId,
        webhookUrl,
      } as AnnouncementResponse;

      if (isBroadcast(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          contentHash: Buffer.isBuffer(mapRecord.contentHash)
            ? mapRecord.contentHash.toString()
            : mapRecord.contentHash,
          url: mapRecord.url,
          announcementType: mapRecord.announcementType,
        };
        queue = this.broadcastQueue;
        typeName = 'Broadcast';
      } else if (isTombstone(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          targetAnnouncementType: mapRecord.targetAnnouncementType,
          targetContentHash: Buffer.isBuffer(mapRecord.targetContentHash)
            ? mapRecord.targetContentHash.toString()
            : mapRecord.targetContentHash,
          announcementType: mapRecord.announcementType,
        };
        queue = this.tombstoneQueue;
        typeName = 'Tombstone';
      } else if (isReaction(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          announcementType: mapRecord.announcementType,
          inReplyTo: mapRecord.inReplyTo,
          emoji: mapRecord.emoji,
          apply: mapRecord.apply,
        };
        queue = this.reactionQueue;
        typeName = 'Reaction';
      } else if (isReply(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          announcementType: mapRecord.announcementType,
          url: mapRecord.url,
          inReplyTo: mapRecord.inReplyTo,
          contentHash: Buffer.isBuffer(mapRecord.contentHash)
            ? mapRecord.contentHash.toString()
            : mapRecord.contentHash,
        };
        queue = this.replyQueue;
        typeName = 'Reply';
      } else if (isProfile(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          announcementType: mapRecord.announcementType,
          url: mapRecord.url,
          contentHash: Buffer.isBuffer(mapRecord.contentHash)
            ? mapRecord.contentHash.toString()
            : mapRecord.contentHash,
        };
        queue = this.profileQueue;
        typeName = 'Profile';
      } else if (isUpdate(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          announcementType: mapRecord.announcementType,
          url: mapRecord.url,
          contentHash: Buffer.isBuffer(mapRecord.contentHash)
            ? mapRecord.contentHash.toString()
            : mapRecord.contentHash,
          targetAnnouncementType: mapRecord.targetAnnouncementType,
          targetContentHash: Buffer.isBuffer(mapRecord.targetContentHash)
            ? mapRecord.targetContentHash.toString()
            : mapRecord.targetContentHash,
        };
        queue = this.updateQueue;
        typeName = 'Update';
      } else {
        throw new Error(`Unknown announcement type ${JSON.stringify(mapRecord)}`);
      }
      await this.enqueueAnnouncementResponse(announcementResponse, typeName, queue);
    });
  }

  private async isQueueFull(queue: Queue): Promise<boolean> {
    const highWater = this.config.queueHighWater;
    const queueStats = await queue.getJobCounts();
    const queueIsFull = queueStats.waiting + queueStats.active >= highWater;
    if (queueIsFull) {
      this.logger.log(`Queue ${queue.name} is full`);
      // TODO: If queue is full, maybe throw a Delayed error?
      throw new Error(`Queue ${queue.name} is full`);
    }
    return queueIsFull;
  }
}
