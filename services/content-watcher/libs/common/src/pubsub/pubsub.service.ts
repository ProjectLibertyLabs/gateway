import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import axios from 'axios';
import { REGISTERED_WEBHOOK_KEY } from '../constants';
import { AnnouncementResponse } from '../interfaces/announcement_response';
import { ConfigService } from '../config/config.service';

@Injectable()
export class PubSubService {
  private logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async process(message: AnnouncementResponse, messageType: string) {
    this.logger.debug(`Sending announcements to webhooks`);

    // Get the registered webhooks for the specific messageType
    const registeredWebhook = await this.redis.get(REGISTERED_WEBHOOK_KEY);
    let currentWebhookRegistrationDtos: { announcementType: string; urls: string[] }[] = [];

    // Pause the queues since nobody is listening
    if (!registeredWebhook) {
      return;
    }

    currentWebhookRegistrationDtos = JSON.parse(registeredWebhook);
    // Find the registrations for the specified messageType
    const registrationsForMessageType = currentWebhookRegistrationDtos.find((registration) => registration.announcementType === messageType.toLowerCase());

    if (registrationsForMessageType) {
      registrationsForMessageType.urls.forEach(async (webhookUrl) => {
        let retries = 0;
        while (retries < this.configService.getWebookMaxRetries()) {
          try {
            this.logger.debug(`Sending announcement to webhook: ${webhookUrl}`);
            this.logger.debug(`Announcement: ${JSON.stringify(message)}`);
            // eslint-disable-next-line no-await-in-loop
            await axios.post(webhookUrl, message);
            this.logger.debug(`Announcement sent to webhook: ${webhookUrl}`);
            break;
          } catch (error) {
            this.logger.error(`Failed to send announcement to webhook: ${webhookUrl}`);
            this.logger.error(error);
            retries += 1;
          }
        }
      });
    }
  }
}
