import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CID } from 'multiformats';
import { hexToString } from '@polkadot/util';
import { PalletSchemasSchema } from '@polkadot/types/lookup';
import { fromFrequencySchema } from '@dsnp/frequency-schemas/parquet';
import parquet from '@dsnp/parquetjs';
import { ConfigService } from '../config/config.service';
import { QueueConstants } from '..';
import { IIPFSJob } from '../interfaces/ipfs.job.interface';
import { BaseConsumer } from '../utils/base-consumer';
import { IpfsService } from '../utils/ipfs.client';
import { BlockchainService } from '../blockchain/blockchain.service';
import { RedisUtils } from '../utils/redis';
import { Announcement, AnnouncementType, BroadcastAnnouncement, ProfileAnnouncement, ReactionAnnouncement, ReplyAnnouncement, TombstoneAnnouncement } from '../interfaces/dsnp';
import { AnnouncementResponse } from '../interfaces/announcement_response';

@Injectable()
@Processor(QueueConstants.IPFS_QUEUE, {
  concurrency: 2,
})
export class IPFSContentProcessor extends BaseConsumer {
  public logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.BROADCAST_QUEUE_NAME) private broadcastQueue: Queue,
    @InjectQueue(QueueConstants.TOMBSTONE_QUEUE_NAME) private tombstoneQueue: Queue,
    @InjectQueue(QueueConstants.REACTION_QUEUE_NAME) private reactionQueue: Queue,
    @InjectQueue(QueueConstants.REPLY_QUEUE_NAME) private replyQueue: Queue,
    @InjectQueue(QueueConstants.PROFILE_QUEUE_NAME) private profileQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
    private ipfsService: IpfsService,
    private blockchainService: BlockchainService,
  ) {
    super();
  }

  async process(job: Job<IIPFSJob, any, string>): Promise<any> {
    try {
      this.logger.log(`IPFS Processing job ${job.id}`);
      this.logger.debug(`IPFS CID: ${job.data.cid} for schemaId: ${job.data.schemaId}`);
      const cid = CID.parse(job.data.cid);

      const ipfsHash = cid.toV0().toString();
      this.logger.debug(`IPFS Hash: ${ipfsHash}`);

      const contentBuffer = await this.ipfsService.getPinned(ipfsHash);
      const schemaCacheKey = `schema:${job.data.schemaId}`;
      let cachedSchema: string | null = await this.redis.get(schemaCacheKey);
      if (!cachedSchema) {
        const schemaResponse = await this.blockchainService.getSchema(job.data.schemaId);
        cachedSchema = JSON.stringify(schemaResponse);
        await this.redis.setex(schemaCacheKey, RedisUtils.STORAGE_EXPIRE_UPPER_LIMIT_SECONDS, cachedSchema);
      }

      // make sure schemaId is a valid one to prevent DoS
      const frequencySchema: PalletSchemasSchema = JSON.parse(cachedSchema);
      const hexString: string = Buffer.from(frequencySchema.model).toString('utf8');
      const schema = JSON.parse(hexToString(hexString));
      if (!schema) {
        throw new Error(`Unable to parse schema for schemaId ${job.data.schemaId}`);
      }

      const reader = await parquet.ParquetReader.openBuffer(contentBuffer);
      const cursor = reader.getCursor();
      const records: Map<string, Announcement> = new Map();

      const record = await cursor.next();
      while (record) {
        const announcementRecordCast = record as Announcement;
        if (records.has(announcementRecordCast.announcementType.toString())) {
          records[announcementRecordCast.announcementType.toString()].push(announcementRecordCast);
        } else {
          records[announcementRecordCast.announcementType.toString()] = [announcementRecordCast];
        }
      }

      await this.buildAndQueueDSNPAnnouncements(records, schema, job.data);

      this.logger.log(`IPFS Job ${job.id} completed`);
    } catch (e) {
      this.logger.error(`IPFS Job ${job.id} failed with error: ${e}`);
      throw e;
    }
  }

  private async buildAndQueueDSNPAnnouncements(records: Map<string, Announcement>, schema: any, jobData: IIPFSJob): Promise<void> {
    let jobRequestId = jobData.requestId;
    if (!jobRequestId) {
      jobRequestId = '🖨️ from Frequency';
    }

    records.forEach(async (mapRecord) => {
      switch (mapRecord.announcementType) {
        case AnnouncementType.Broadcast: {
          const broadCastResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as BroadcastAnnouncement,
            requestId: jobRequestId,
          };
          await this.broadcastQueue.add('Broadcast', broadCastResponse);
          break;
        }
        case AnnouncementType.Tombstone: {
          const tombstoneResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as TombstoneAnnouncement,
            requestId: jobRequestId,
          };
          await this.tombstoneQueue.add('Tombstone', tombstoneResponse);
          break;
        }
        case AnnouncementType.Reaction: {
          const reactionResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as ReactionAnnouncement,
            requestId: jobRequestId,
          };
          await this.reactionQueue.add('Reaction', reactionResponse);
          break;
        }
        case AnnouncementType.Reply: {
          const replyResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as ReplyAnnouncement,
            requestId: jobRequestId,
          };
          await this.replyQueue.add('Reply', replyResponse);
          break;
        }
        case AnnouncementType.Profile: {
          const profileResponse: AnnouncementResponse = {
            schemaId: jobData.schemaId,
            announcement: mapRecord as ProfileAnnouncement,
            requestId: jobRequestId,
          };
          this.profileQueue.add('Profile', profileResponse);
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
    return queueStats.waiting + queueStats.active >= highWater;
  }
}
