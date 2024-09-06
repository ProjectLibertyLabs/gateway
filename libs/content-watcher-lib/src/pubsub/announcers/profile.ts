import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import * as QueueConstants from '../../queues/queue-constants';
import { BaseConsumer } from '../../utils/base-consumer';
import { PubSubService } from '../pubsub.service';
import { AnnouncementResponse } from '../../types/content-announcement';

@Injectable()
@Processor(QueueConstants.PROFILE_QUEUE_NAME, { concurrency: 2 })
export class ProfileSubscriber extends BaseConsumer {
  constructor(private readonly pubsubService: PubSubService) {
    super();
  }

  async process(job: Job<AnnouncementResponse, any, string>): Promise<any> {
    this.logger.debug(`Sending 🔲 profiles to registered webhooks`);
    try {
      await this.pubsubService.process(job.data, 'profile');
      this.logger.debug(`Profile sent to registered webhooks`);
    } catch (error) {
      this.logger.error(`Failed to send profile to registered webhooks`);
      throw error;
    }
  }
}
