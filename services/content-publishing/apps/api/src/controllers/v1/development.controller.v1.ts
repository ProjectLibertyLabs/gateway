/*
This is a controller providing some endpoints useful for development and testing.
*/

// eslint-disable-next-line max-classes-per-file
import { Controller, Get, Logger, NotFoundException, Param, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Job } from 'bullmq/dist/esm/classes/job';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  createBroadcast,
  createProfile,
  createUpdate,
  AnnouncementType,
  createReply,
  createReaction,
  createTombstone,
  BroadcastAnnouncement,
  ProfileAnnouncement,
  UpdateAnnouncement,
  ReplyAnnouncement,
  ReactionAnnouncement,
  TombstoneAnnouncement,
} from '#libs/interfaces';
import { QueueConstants } from '#libs/queues';
import { calculateDsnpHash } from '#libs/utils/ipfs';
import { IpfsService } from '#libs/utils/ipfs.client';
import { AnnouncementTypeDto } from '#libs/dtos';

@Controller('dev')
@ApiTags('dev')
export class DevelopmentControllerV1 {
  private readonly logger: Logger;

  private readonly queueMapper: Map<AnnouncementTypeDto, Queue>;

  constructor(
    @InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue,
    @InjectQueue(QueueConstants.BROADCAST_QUEUE_NAME) broadcastQueue: Queue,
    @InjectQueue(QueueConstants.REPLY_QUEUE_NAME) replyQueue: Queue,
    @InjectQueue(QueueConstants.REACTION_QUEUE_NAME) reactionQueue: Queue,
    @InjectQueue(QueueConstants.UPDATE_QUEUE_NAME) updateQueue: Queue,
    @InjectQueue(QueueConstants.PROFILE_QUEUE_NAME) profileQueue: Queue,
    @InjectQueue(QueueConstants.TOMBSTONE_QUEUE_NAME) tombstoneQueue: Queue,
    private ipfsService: IpfsService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.queueMapper = new Map([
      [AnnouncementTypeDto.BROADCAST, broadcastQueue],
      [AnnouncementTypeDto.REPLY, replyQueue],
      [AnnouncementTypeDto.REACTION, reactionQueue],
      [AnnouncementTypeDto.UPDATE, updateQueue],
      [AnnouncementTypeDto.PROFILE, profileQueue],
      [AnnouncementTypeDto.TOMBSTONE, tombstoneQueue],
    ]);
  }

  @Get('/request/:jobId')
  @ApiOperation({ summary: 'Get a Job given a jobId', description: 'ONLY enabled when ENVIRONMENT="dev".' })
  async requestJob(@Param('jobId') jobId: string) {
    this.logger.log(jobId);
    const job = await this.requestQueue.getJob(jobId);
    this.logger.log(job);
    return job;
  }

  @Get('/asset/:assetId')
  @ApiOperation({ summary: 'Get an Asset given an assetId', description: 'ONLY enabled when ENVIRONMENT="dev".' })
  @ApiResponse({ status: '2XX', type: Buffer })
  // eslint-disable-next-line consistent-return
  async getAsset(@Param('assetId') assetId: string) {
    if (await this.ipfsService.isPinned(assetId)) {
      return this.ipfsService.getPinned(assetId, false);
    }
    throw new NotFoundException(`${assetId} does not exist`);
  }

  @Post('/dummy/announcement/:queueType/:count')
  @ApiOperation({ summary: 'Create dummy announcement data', description: 'ONLY enabled when ENVIRONMENT="dev".' })
  async populate(@Param('queueType') queueType: AnnouncementTypeDto, @Param('count') count: number) {
    const promises: Promise<Job>[] = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < count; i++) {
      let data:
        | BroadcastAnnouncement
        | ProfileAnnouncement
        | UpdateAnnouncement
        | ReplyAnnouncement
        | ReactionAnnouncement
        | TombstoneAnnouncement;
      // eslint-disable-next-line default-case
      const fromId = `${Math.floor(Math.random() * 100000000)}`;
      const hash = `${Math.floor(Math.random() * 100000000)}`;
      switch (queueType) {
        case AnnouncementTypeDto.BROADCAST:
          data = createBroadcast(fromId, `https://example.com/${Math.floor(Math.random() * 100000000)}`, hash);
          break;
        case AnnouncementTypeDto.PROFILE:
          data = createProfile(fromId, `https://example.com/${Math.floor(Math.random() * 100000000)}`, hash);
          break;
        case AnnouncementTypeDto.UPDATE:
          data = createUpdate(
            fromId,
            `https://example.com/${Math.floor(Math.random() * 100000000)}`,
            hash,
            AnnouncementType.Broadcast,
            `${Math.floor(Math.random() * 100000000)}`,
          );
          break;
        case AnnouncementTypeDto.REPLY:
          data = createReply(
            fromId,
            `https://example.com/${Math.floor(Math.random() * 100000000)}`,
            hash,
            `dsnp://0x${Math.floor(Math.random() * 100000000)}/0x${Math.floor(Math.random() * 100000000)}`,
          );
          break;
        case AnnouncementTypeDto.REACTION:
          data = createReaction(
            fromId,
            '🤌🏼',
            `dsnp://0x${Math.floor(Math.random() * 100000000)}/0x${Math.floor(Math.random() * 100000000)}`,
            1,
          );
          break;
        case AnnouncementTypeDto.TOMBSTONE:
          data = createTombstone(fromId, AnnouncementType.Reply, hash);
          break;
        default:
          throw new Error('Announcement type not supported');
      }
      // eslint-disable-next-line no-await-in-loop
      const jobId = await calculateDsnpHash(Buffer.from(JSON.stringify(data)));
      const queue = this.queueMapper.get(queueType);
      if (queue) {
        promises.push(
          queue.add(`Dummy Job - ${data.id}`, data, { jobId, removeOnFail: false, removeOnComplete: true }),
        );
      }
    }
    await Promise.all(promises);
  }
}
