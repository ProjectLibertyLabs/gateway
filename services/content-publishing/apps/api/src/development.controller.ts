/*
This is a controller providing some endpoints useful for development and testing.
*/

// eslint-disable-next-line max-classes-per-file
import { Controller, Get, Logger, NotFoundException, Param, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Job } from 'bullmq/dist/esm/classes/job';
import * as QueueConstants from '../../../libs/common/src';
import { IpfsService } from '../../../libs/common/src/utils/ipfs.client';
import { AnnouncementType, createBroadcast, createProfile, createReaction, createReply, createTombstone, createUpdate } from '../../../libs/common/src/interfaces/dsnp';
import { calculateDsnpHash } from '../../../libs/common/src/utils/ipfs';
import { ApiOperation } from '@nestjs/swagger';

@Controller('dev')
export class DevelopmentController {
  private readonly logger: Logger;

  private readonly queueMapper: Map<QueueConstants.AnnouncementTypeDto, Queue>;

  constructor(
    @InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue,
    @InjectQueue(QueueConstants.BROADCAST_QUEUE_NAME) private broadcastQueue: Queue,
    @InjectQueue(QueueConstants.REPLY_QUEUE_NAME) private replyQueue: Queue,
    @InjectQueue(QueueConstants.REACTION_QUEUE_NAME) private reactionQueue: Queue,
    @InjectQueue(QueueConstants.UPDATE_QUEUE_NAME) private updateQueue: Queue,
    @InjectQueue(QueueConstants.PROFILE_QUEUE_NAME) private profileQueue: Queue,
    @InjectQueue(QueueConstants.TOMBSTONE_QUEUE_NAME) private tombstoneQueue: Queue,
    private ipfsService: IpfsService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.queueMapper = new Map([
      [QueueConstants.AnnouncementTypeDto.BROADCAST, broadcastQueue],
      [QueueConstants.AnnouncementTypeDto.REPLY, replyQueue],
      [QueueConstants.AnnouncementTypeDto.REACTION, reactionQueue],
      [QueueConstants.AnnouncementTypeDto.UPDATE, updateQueue],
      [QueueConstants.AnnouncementTypeDto.PROFILE, profileQueue],
      [QueueConstants.AnnouncementTypeDto.TOMBSTONE, tombstoneQueue],
    ]);
  }

  @Get('/request/:jobId')
  @ApiOperation({ summary: 'Get a Job given a jobId' })
  async requestJob(@Param('jobId') jobId: string) {
    this.logger.log(jobId);
    const job = await this.requestQueue.getJob(jobId);
    this.logger.log(job);
    return job;
  }

  @Get('/asset/:assetId')
  @ApiOperation({ summary: 'Get an Asset given an assetId' })
  // eslint-disable-next-line consistent-return
  async getAsset(@Param('assetId') assetId: string) {
    if (await this.ipfsService.isPinned(assetId)) {
      return this.ipfsService.getPinned(assetId, false);
    }
    throw new NotFoundException(`${assetId} does not exist`);
  }

  @Post('/dummy/announcement/:queueType/:count')
  @ApiOperation({ summary: 'Create dummy announcement data' })
  async populate(@Param('queueType') queueType: QueueConstants.AnnouncementTypeDto, @Param('count') count: number) {
    const promises: Promise<Job>[] = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < count; i++) {
      let data: any;
      // eslint-disable-next-line default-case
      const fromId = `${Math.floor(Math.random() * 100000000)}`;
      const hash = `${Math.floor(Math.random() * 100000000)}`;
      switch (queueType) {
        case QueueConstants.AnnouncementTypeDto.BROADCAST:
          data = createBroadcast(fromId, `https://example.com/${Math.floor(Math.random() * 100000000)}`, hash);
          break;
        case QueueConstants.AnnouncementTypeDto.PROFILE:
          data = createProfile(fromId, `https://example.com/${Math.floor(Math.random() * 100000000)}`, hash);
          break;
        case QueueConstants.AnnouncementTypeDto.UPDATE:
          data = createUpdate(fromId, `https://example.com/${Math.floor(Math.random() * 100000000)}`, hash, AnnouncementType.Broadcast, `${Math.floor(Math.random() * 100000000)}`);
          break;
        case QueueConstants.AnnouncementTypeDto.REPLY:
          data = createReply(
            fromId,
            `https://example.com/${Math.floor(Math.random() * 100000000)}`,
            hash,
            `dsnp://0x${Math.floor(Math.random() * 100000000)}/0x${Math.floor(Math.random() * 100000000)}`,
          );
          break;
        case QueueConstants.AnnouncementTypeDto.REACTION:
          data = createReaction(fromId, '🤌🏼', `dsnp://0x${Math.floor(Math.random() * 100000000)}/0x${Math.floor(Math.random() * 100000000)}`, 1);
          break;
        case QueueConstants.AnnouncementTypeDto.TOMBSTONE:
          data = createTombstone(fromId, AnnouncementType.Reply, hash);
          break;
        default:
          throw new Error('Announcement type not supported');
      }
      // eslint-disable-next-line no-await-in-loop
      const jobId = await calculateDsnpHash(Buffer.from(JSON.stringify(data)));
      promises.push(this.queueMapper.get(queueType)!.add(`Dummy Job - ${data.id}`, data, { jobId, removeOnFail: false, removeOnComplete: true }));
    }
    await Promise.all(promises);
  }
}
