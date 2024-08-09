import { Injectable, Logger } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { hexToString } from '@polkadot/util';
import parquet from '@dsnp/parquetjs';
import { bases } from 'multiformats/basics';
import { AppConfigService } from '../config/config.service';
import { calculateJobId } from '..';
import * as QueueConstants from '../queues/queue-constants';
import { IIPFSJob } from '../interfaces/ipfs.job.interface';
import { BaseConsumer } from '../utils/base-consumer';
import { IpfsService } from '../utils/ipfs.client';
import {
  AnnouncementResponse,
  AnnouncementType,
  BroadcastAnnouncement,
  ProfileAnnouncement,
  ReactionAnnouncement,
  ReplyAnnouncement,
  TombstoneAnnouncement,
  UpdateAnnouncement,
} from '../types/content-announcement';
import {
  isBroadcast,
  isProfile,
  isReaction,
  isReply,
  isTombstone,
  isTypedAnnouncement,
  isUpdate,
} from '../utils/type-guards';

@Injectable()
@Processor(QueueConstants.IPFS_QUEUE, {
  concurrency: 2,
})
export class IPFSContentProcessor extends BaseConsumer {
  public logger: Logger;

  constructor(
    @InjectQueue(QueueConstants.BROADCAST_QUEUE_NAME) private broadcastQueue: Queue,
    @InjectQueue(QueueConstants.TOMBSTONE_QUEUE_NAME) private tombstoneQueue: Queue,
    @InjectQueue(QueueConstants.REACTION_QUEUE_NAME) private reactionQueue: Queue,
    @InjectQueue(QueueConstants.REPLY_QUEUE_NAME) private replyQueue: Queue,
    @InjectQueue(QueueConstants.PROFILE_QUEUE_NAME) private profileQueue: Queue,
    @InjectQueue(QueueConstants.UPDATE_QUEUE_NAME) private updateQueue: Queue,
    private configService: AppConfigService,
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
          contentHash: mapRecord.contentHash,
          url: mapRecord.url,
          announcementType: mapRecord.announcementType,
        };
        queue = this.broadcastQueue;
        typeName = 'Broadcast';
      } else if (isTombstone(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          targetAnnouncementType: mapRecord.targetAnnouncementType,
          targetContentHash: mapRecord.targetContentHash,
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
          contentHash: mapRecord.contentHash,
        };
        queue = this.replyQueue;
        typeName = 'Reply';
      } else if (isProfile(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          announcementType: mapRecord.announcementType,
          url: mapRecord.url,
          contentHash: mapRecord.contentHash,
        };
        queue = this.profileQueue;
        typeName = 'Profile';
      } else if (isUpdate(mapRecord)) {
        announcementResponse.announcement = {
          fromId: mapRecord.fromId,
          announcementType: mapRecord.announcementType,
          url: mapRecord.url,
          contentHash: mapRecord.contentHash,
          targetAnnouncementType: mapRecord.targetAnnouncementType,
          targetContentHash: mapRecord.targetContentHash,
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
    const highWater = this.configService.queueHighWater;
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
