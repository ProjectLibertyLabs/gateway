import { Processor } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import { ContentWatcherQueues as QueueConstants } from '#types/constants/queue.constants';
import { BaseConsumer } from '#consumer';
import { PubSubService } from '../pubsub.service';
import { AnnouncementResponse } from '#types/content-announcement';
import apiConfig, { IContentWatcherApiConfig } from '#content-watcher/api.config';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
@Processor(QueueConstants.WATCHER_PROFILE_QUEUE_NAME, { concurrency: 2 })
export class ProfileSubscriber extends BaseConsumer implements OnApplicationBootstrap {
  public onApplicationBootstrap() {
    this.worker.concurrency = this.config[`${this.worker.name}QueueWorkerConcurrency`] || 2;
  }

  constructor(
    private readonly pubsubService: PubSubService,
    @Inject(apiConfig.KEY) private readonly config: IContentWatcherApiConfig,
    protected readonly logger: PinoLogger,
  ) {
    super(logger);
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
