import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueConstants } from '../..';
import { BaseConsumer } from '../../utils/base-consumer';
import { AnnouncementResponse } from '../../interfaces/announcement_response';
import { PubSubService } from '../pubsub.service';

@Injectable()
@Processor(QueueConstants.UPDATE_QUEUE_NAME, { concurrency: 2 })
export class UpdateSubscriber extends BaseConsumer {
  constructor(private readonly pubsubService: PubSubService) {
    super();
  }

  async process(job: Job<AnnouncementResponse, any, string>): Promise<any> {
    this.logger.debug(`Sending ⏫ update to registered webhooks`);
    try {
      await this.pubsubService.process(job.data, 'update');
      this.logger.debug(`Update sent to registered webhooks`);
    } catch (error) {
      this.logger.error(`Failed to send update to registered webhooks`);
      throw error;
    }
  }
}
