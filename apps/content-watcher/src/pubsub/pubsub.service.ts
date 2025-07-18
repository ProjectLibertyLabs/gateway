import { InjectRedis } from '@songkeys/nestjs-redis';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import axios from 'axios';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { EVENTS_TO_WATCH_KEY, REGISTERED_WEBHOOK_KEY } from '#types/constants';
import { ChainWatchOptionsDto } from '#types/dtos/content-watcher/chain.watch.dto';
import { AnnouncementResponse } from '#types/content-announcement';
import { IAnnouncementSubscription } from '#types/interfaces/content-watcher/announcement-subscription.interface';
import pubsubConfig, { IPubSubConfig } from './pubsub.config';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

@Injectable()
export class PubSubService {
  private logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @Inject(pubsubConfig.KEY) private readonly config: IPubSubConfig,
    @Inject(httpCommonConfig.KEY) private readonly httpConfig: IHttpCommonConfig,
  ) {
    this.logger = pino(getBasicPinoOptions(this.constructor.name));
  }

  async process(message: AnnouncementResponse, messageType: string) {
    this.logger.debug(`Sending announcements to webhooks`);
    // if any specific dsnpIds are request out of system, filter others out
    if (message.requestId && !(await this.filterJobRequest(message.requestId, message.announcement.fromId))) {
      return;
    }
    if (!(await this.filterChainWatch(message.announcement.fromId))) {
      return;
    }
    // Get the registered webhooks for the specific messageType
    let currentWebhookRegistrationDtos: IAnnouncementSubscription[] = [];
    // A webhookUrl on a message means it was scanned by a targeted search and should not be broadcast to all registered webhooks
    if (message?.webhookUrl) {
      currentWebhookRegistrationDtos = [{ announcementType: messageType.toLowerCase(), urls: [message.webhookUrl] }];
    } else {
      const registeredWebhook = message.webhookUrl ?? (await this.redis.get(REGISTERED_WEBHOOK_KEY));

      // Pause the queues since nobody is listening
      if (!registeredWebhook) {
        return;
      }

      currentWebhookRegistrationDtos = JSON.parse(registeredWebhook) as IAnnouncementSubscription[];
    }
    // Find the registrations for the specified messageType
    const registrationsForMessageType = currentWebhookRegistrationDtos.find(
      (registration) => registration.announcementType === messageType.toLowerCase(),
    );

    if (registrationsForMessageType) {
      registrationsForMessageType.urls.forEach(async (webhookUrl) => {
        let retries = 0;
        while (retries < this.config.webhookMaxRetries) {
          try {
            this.logger.debug(`Sending announcement to webhook: ${webhookUrl}`);
            this.logger.debug(`Announcement: ${JSON.stringify(message)}`);
            // eslint-disable-next-line no-await-in-loop
            await axios.post(webhookUrl, message, { timeout: this.httpConfig.httpResponseTimeoutMS });
            this.logger.debug(`Announcement sent to webhook: ${webhookUrl}`);
            break;
          } catch (error) {
            this.logger.error(`Failed to send announcement to webhook: ${webhookUrl}`);
            this.logger.error(error);
            retries += 1;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => {
              setTimeout(r, this.config.webhookRetryIntervalSeconds * MILLISECONDS_PER_SECOND);
            });
          }
        }
      });
    }
  }

  private async filterChainWatch(dsnpId: string): Promise<boolean> {
    const currentWatchOptions = await this.redis.get(EVENTS_TO_WATCH_KEY);
    const watchOptions: ChainWatchOptionsDto = currentWatchOptions ? JSON.parse(currentWatchOptions) : null;
    if (watchOptions?.dsnpIds?.length > 0) {
      if (watchOptions.dsnpIds.includes(dsnpId)) {
        return true;
      }
      return false;
    }
    return true;
  }

  private async filterJobRequest(jobId: string, dsnpId: string): Promise<boolean> {
    const JOB_REQUEST_WATCH_KEY = `${EVENTS_TO_WATCH_KEY}:${jobId}`;
    const jobRequestWatch = await this.redis.get(JOB_REQUEST_WATCH_KEY);
    const jobRequestWatchOptions: ChainWatchOptionsDto = jobRequestWatch ? JSON.parse(jobRequestWatch) : null;
    if (jobRequestWatchOptions?.dsnpIds?.length > 0) {
      if (jobRequestWatchOptions.dsnpIds.includes(dsnpId)) {
        return true;
      }
      return false;
    }
    return true;
  }
}
