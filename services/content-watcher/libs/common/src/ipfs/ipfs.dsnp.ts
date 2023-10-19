import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { hexToString } from '@polkadot/util';
import parquet from '@dsnp/parquetjs';
import { ConfigService } from '../config/config.service';
import { QueueConstants } from '..';
import { IIPFSJob } from '../interfaces/ipfs.job.interface';
import { BaseConsumer } from '../utils/base-consumer';
import { IpfsService } from '../utils/ipfs.client';
import { Announcement, AnnouncementType, BroadcastAnnouncement, ProfileAnnouncement, ReactionAnnouncement, ReplyAnnouncement, TombstoneAnnouncement } from '../interfaces/dsnp';
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
    private configService: ConfigService,
    private ipfsService: IpfsService,
  ) {
    super();
  }

  async process(job: Job<IIPFSJob, any, string>): Promise<any> {
    try {
      this.logger.log(`IPFS Processing job ${job.id}`);
      if(!job.data.cid) {
        this.logger.error(`IPFS Job ${job.id} failed with no CID`);
        return;
      }
      const cidStr = hexToString(job.data.cid);
      const contentBuffer = await this.ipfsService.getPinned(cidStr, true);

      if(contentBuffer.byteLength === 0) {
        this.logger.log(`IPFS Job ${job.id} completed with no content`);
        return;
      }

      const reader = await parquet.ParquetReader.openBuffer(contentBuffer);
      const cursor = reader.getCursor();
      const records: Announcement[] = [];
      let record = await cursor.next();
      while (record) {
        const announcementRecordCast = record as Announcement;
        records.push(announcementRecordCast);
        record = await cursor.next();
      }

      await this.buildAndQueueDSNPAnnouncements(records, job.data);

      this.logger.log(`IPFS Job ${job.id} completed`);
    } catch (e) {
      this.logger.error(`IPFS Job ${job.id} failed with error: ${e}`);
      throw e;
    }
  }

  private async buildAndQueueDSNPAnnouncements(records: Announcement[], jobData: IIPFSJob): Promise<void> {
    const jobRequestId = jobData.requestId;
    records.forEach(async (mapRecord) => {
      switch (mapRecord.announcementType) {
        case AnnouncementType.Broadcast: {
          const broadCastResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as BroadcastAnnouncement,
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.broadcastQueue))) {
            await this.broadcastQueue.add('Broadcast', broadCastResponse);
          }
          break;
        }
        case AnnouncementType.Tombstone: {
          const tombstoneResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as TombstoneAnnouncement,
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.tombstoneQueue))) {
            await this.tombstoneQueue.add('Tombstone', tombstoneResponse);
          }
          break;
        }
        case AnnouncementType.Reaction: {
          const reactionResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as ReactionAnnouncement,
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.reactionQueue))) {
            await this.reactionQueue.add('Reaction', reactionResponse);
          }
          break;
        }
        case AnnouncementType.Reply: {
          const replyResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as ReplyAnnouncement,
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.replyQueue))) {
            await this.replyQueue.add('Reply', replyResponse);
          }
          break;
        }
        case AnnouncementType.Profile: {
          const profileResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as ProfileAnnouncement,
            requestId: jobRequestId,
          };
          if (!(await this.isQueueFull(this.profileQueue))) {
            this.profileQueue.add('Profile', profileResponse);
          }
          break;
        }
        default:
          throw new Error(`Unknown announcement type ${mapRecord}`);
      }
    });
  }

  private async isQueueFull(queue: Queue): Promise<boolean> {
    const highWater = this.configService.getQueueHighWater();
    const queueStats = await queue.getJobCounts();
    const canAddJobs = queueStats.waiting + queueStats.active >= highWater;
    if (canAddJobs) {
      this.logger.log(`Queue ${queue.name} is full`);
      throw new Error(`Queue ${queue.name} is full`);
    }
    return canAddJobs;
  }
}
