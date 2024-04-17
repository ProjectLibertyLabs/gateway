import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { hexToString } from '@polkadot/util';
import parquet from '@dsnp/parquetjs';
import { bases } from 'multiformats/basics';
import { ConfigService } from '../config/config.service';
import { QueueConstants, calculateJobId } from '..';
import { IIPFSJob } from '../interfaces/ipfs.job.interface';
import { BaseConsumer } from '../utils/base-consumer';
import { IpfsService } from '../utils/ipfs.client';
import {
  AnnouncementType,
  BroadcastAnnouncement,
  ProfileAnnouncement,
  ReactionAnnouncement,
  ReplyAnnouncement,
  TombstoneAnnouncement,
  UpdateAnnouncement,
} from '../interfaces/dsnp';
import { AnnouncementResponse } from '../interfaces/announcement_response';

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
    private configService: ConfigService,
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

  private async buildAndQueueDSNPAnnouncements(records: any[], jobData: IIPFSJob): Promise<void> {
    const jobRequestId = jobData.requestId;
    const blockNumer = jobData.blockNumber;
    records.forEach(async (mapRecord) => {
      switch (mapRecord.announcementType) {
        case AnnouncementType.Broadcast: {
          const recordAnnouncement = mapRecord as BroadcastAnnouncement;
          const broadCastResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            blockNumber: blockNumer,
            announcement: {
              fromId: recordAnnouncement.fromId,
              contentHash: bases.base58btc.encode(recordAnnouncement.contentHash as any),
              url: recordAnnouncement.url,
              announcementType: recordAnnouncement.announcementType,
            },
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.broadcastQueue))) {
            const jobId = calculateJobId(broadCastResponse);
            await this.broadcastQueue.add('Broadcast', broadCastResponse, { jobId });
          }
          break;
        }
        case AnnouncementType.Tombstone: {
          const tombRecord = mapRecord as TombstoneAnnouncement;
          const tombstoneResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            blockNumber: blockNumer,
            announcement: {
              fromId: tombRecord.fromId,
              targetAnnouncementType: tombRecord.targetAnnouncementType,
              targetContentHash: bases.base58btc.encode(tombRecord.targetContentHash as any),
              announcementType: tombRecord.announcementType,
            },
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.tombstoneQueue))) {
            const jobId = calculateJobId(tombstoneResponse);
            await this.tombstoneQueue.add('Tombstone', tombstoneResponse, { jobId });
          }
          break;
        }
        case AnnouncementType.Reaction: {
          const reactionRecord = mapRecord as ReactionAnnouncement;
          const reactionResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            blockNumber: blockNumer,
            announcement: {
              fromId: reactionRecord.fromId,
              announcementType: reactionRecord.announcementType,
              inReplyTo: reactionRecord.inReplyTo,
              emoji: reactionRecord.emoji,
              apply: reactionRecord.apply,
            },
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.reactionQueue))) {
            const jobId = calculateJobId(reactionResponse);
            await this.reactionQueue.add('Reaction', reactionResponse, { jobId });
          }
          break;
        }
        case AnnouncementType.Reply: {
          const replyRecord = mapRecord as ReplyAnnouncement;
          const replyResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            blockNumber: blockNumer,
            announcement: {
              fromId: replyRecord.fromId,
              announcementType: replyRecord.announcementType,
              url: replyRecord.url,
              inReplyTo: replyRecord.inReplyTo,
              contentHash: bases.base58btc.encode(replyRecord.contentHash as any),
            },
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.replyQueue))) {
            const jobId = calculateJobId(replyResponse);
            await this.replyQueue.add('Reply', replyResponse, { jobId });
          }
          break;
        }
        case AnnouncementType.Profile: {
          const profileRecord = mapRecord as ProfileAnnouncement;
          const profileResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            blockNumber: blockNumer,
            announcement: {
              fromId: profileRecord.fromId,
              announcementType: profileRecord.announcementType,
              url: profileRecord.url,
              contentHash: bases.base58btc.encode(profileRecord.contentHash as any),
            },
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.profileQueue))) {
            const jobId = calculateJobId(profileResponse);
            this.profileQueue.add('Profile', profileResponse, { jobId });
          }
          break;
        }
        case AnnouncementType.Update: {
          const updateRecord = mapRecord as UpdateAnnouncement;
          const updateResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            blockNumber: blockNumer,
            announcement: {
              fromId: updateRecord.fromId,
              announcementType: updateRecord.announcementType,
              url: updateRecord.url,
              contentHash: bases.base58btc.encode(updateRecord.contentHash as any),
              targetAnnouncementType: updateRecord.targetAnnouncementType,
              targetContentHash: bases.base58btc.encode(updateRecord.targetContentHash as any),
            },
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.profileQueue))) {
            const jobId = calculateJobId(updateResponse);
            this.updateQueue.add('Update', updateResponse, { jobId });
          }
          break;
        }
        default:
          throw new Error(`Unknown announcement type ${JSON.stringify(mapRecord)}`);
      }
    });
  }

  private async isQueueFull(queue: Queue): Promise<boolean> {
    const highWater = this.configService.queueHighWater;
    const queueStats = await queue.getJobCounts();
    const queueIsFull = queueStats.waiting + queueStats.active >= highWater;
    if (queueIsFull) {
      this.logger.log(`Queue ${queue.name} is full`);
      throw new Error(`Queue ${queue.name} is full`);
    }
    return queueIsFull;
  }
}
