import { Processor } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import { ContentWatcherQueues as QueueConstants } from '#types/constants/queue.constants';
import { BaseConsumer } from '#consumer';
import { PubSubService } from '../pubsub.service';
import { AnnouncementResponse } from '#types/content-announcement';
import apiConfig, { IContentWatcherApiConfig } from '#content-watcher/api.config';

@Injectable()
@Processor(QueueConstants.WATCHER_BROADCAST_QUEUE_NAME)
export class BroadcastSubscriber extends BaseConsumer implements OnApplicationBootstrap {
  public onApplicationBootstrap() {
    this.worker.concurrency = this.config[`${this.worker.name}QueueWorkerConcurrency`] || 2;
  }

  constructor(
    private readonly pubsubService: PubSubService,
    @Inject(apiConfig.KEY) private readonly config: IContentWatcherApiConfig,
  ) {
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
