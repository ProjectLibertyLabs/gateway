import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import * as QueueConstants from '../../queues/queue-constants';
import { BaseConsumer } from '../../utils/base-consumer';
import { PubSubService } from '../pubsub.service';
import { AnnouncementResponse } from '../../types/content-announcement';

@Injectable()
@Processor(QueueConstants.BROADCAST_QUEUE_NAME, { concurrency: 2 })
export class BroadcastSubscriber extends BaseConsumer {
  constructor(private readonly pubsubService: PubSubService) {
    super();
  }

  async process(job: Job<AnnouncementResponse, any, string>): Promise<any> {
    this.logger.debug(`Sending 🔊 broadcasts to registered webhooks`);
    try {
      await this.pubsubService.process(job.data, 'broadcast'); // job.name is 'broadcast
      this.logger.debug(`Broadcast sent to registered webhooks`);
    } catch (error) {
      this.logger.error(`Failed to send broadcast to registered webhooks`);
      throw error;
    }
  }
}
