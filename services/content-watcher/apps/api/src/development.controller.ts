/*
This is a controller providing some endpoints useful for development and testing.
To use it, simply rename and remove the '.dev' extension
*/

// eslint-disable-next-line max-classes-per-file
import { Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Job } from 'bullmq/dist/esm/classes/job';
import { AnnouncementTypeDto, QueueConstants } from '../../../libs/common/src';
import { IpfsService } from '../../../libs/common/src/utils/ipfs.client';
import { Announcement, AnnouncementType, BroadcastAnnouncement, createBroadcast } from '../../../libs/common/src/interfaces/dsnp';
import { calculateDsnpHash } from '../../../libs/common/src/utils/ipfs';

@Controller('api/dev')
export class DevelopmentController {
  private readonly logger: Logger;

  private readonly queueMapper: Map<AnnouncementTypeDto, Queue>;

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
      [AnnouncementTypeDto.BROADCAST, broadcastQueue],
      [AnnouncementTypeDto.REPLY, replyQueue],
      [AnnouncementTypeDto.REACTION, reactionQueue],
      [AnnouncementTypeDto.UPDATE, updateQueue],
      [AnnouncementTypeDto.PROFILE, profileQueue],
      [AnnouncementTypeDto.TOMBSTONE, tombstoneQueue],
    ]);
  }

  @Get('/request/:jobId')
  async requestJob(@Param('jobId') jobId: string) {
    this.logger.log(jobId);
    const job = await this.requestQueue.getJob(jobId);
    this.logger.log(job);
    return job;
  }

  @Get('/asset/:assetId')
  // eslint-disable-next-line consistent-return
  async getAsset(@Param('assetId') assetId: string) {
    try {
      return this.ipfsService.getPinned(assetId);
    } catch (error: any) {
      if (error.response) {
        console.error(error.response.data);
      }
      throw error;
    }
  }

  @Post('/dummy/announcement/:queueType/:count')
  async populate(@Param('queueType') queueType: AnnouncementTypeDto, @Param('count') count: number) {
    const promises: Promise<Job>[] = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < count; i++) {
      let data: any;
      // eslint-disable-next-line default-case
      switch (queueType) {
        case AnnouncementTypeDto.BROADCAST:
        case AnnouncementTypeDto.PROFILE:
        case AnnouncementTypeDto.UPDATE:
        case AnnouncementTypeDto.REPLY:
        case AnnouncementTypeDto.REACTION:
        case AnnouncementTypeDto.TOMBSTONE:
          data = createBroadcast(`${Math.floor(Math.random() * 100000000)}`, `https://example.com/${Math.floor(Math.random() * 100000000)}`, '1289739821');
          break;
      }
      // eslint-disable-next-line no-await-in-loop
      const hash = await calculateDsnpHash(Buffer.from(JSON.stringify(data)));
      promises.push(this.queueMapper.get(queueType)!.add(`Dummy Job - ${data.id}`, data, { jobId: hash, removeOnFail: false, removeOnComplete: 2000 }));
    }
    await Promise.all(promises);
  }
}
