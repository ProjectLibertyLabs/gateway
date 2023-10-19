import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueConstants } from '../..';
import { BaseConsumer } from '../../utils/base-consumer';
import { AnnouncementResponse } from '../../interfaces/announcement_response';
import { PubSubService } from '../pubsub.service';

@Injectable()
@Processor(QueueConstants.TOMBSTONE_QUEUE_NAME, { concurrency: 2 })
export class TomstoneSubscriber extends BaseConsumer {
  constructor(private readonly pubsubService: PubSubService) {
    super();
  }

  async process(job: Job<AnnouncementResponse, any, string>): Promise<any> {
    this.logger.debug(`Sending 💀 tombstone to registered webhooks`);
    try {
      await this.pubsubService.process(job.data, 'tombstone');
      this.logger.debug(`Tombstone sent to registered webhooks`);
    } catch (error) {
      this.logger.error(`Failed to send tombstone to registered webhooks`);
      throw error;
    }
  }
}
