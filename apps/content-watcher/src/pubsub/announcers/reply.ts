import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { ContentWatcherQueues as QueueConstants } from '#types/constants/queue.constants';
import { BaseConsumer } from '#consumer';
import { PubSubService } from '../pubsub.service';
import { AnnouncementResponse } from '#types/content-announcement';

@Injectable()
@Processor(QueueConstants.WATCHER_REPLY_QUEUE_NAME, { concurrency: 2 })
export class ReplySubscriber extends BaseConsumer {
  constructor(private readonly pubsubService: PubSubService) {
    super();
  }

  async process(job: Job<AnnouncementResponse, any, string>): Promise<any> {
    this.logger.debug(`Sending 📩 reply to registered webhooks`);
    try {
      await this.pubsubService.process(job.data, 'reply');
      this.logger.debug(`Reply sent to registered webhooks`);
    } catch (error) {
      this.logger.error(`Failed to send reply to registered webhooks`);
      throw error;
    }
  }
}
