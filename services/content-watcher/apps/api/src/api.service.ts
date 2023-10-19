import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ContentSearchRequestDto, QueueConstants, calculateJobId } from '../../../libs/common/src';
import { ScannerService } from '../../../libs/common/src/scanner/scanner';
import { EVENTS_TO_WATCH_KEY, LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, REGISTERED_WEBHOOK_KEY } from '../../../libs/common/src/constants';
import { ChainWatchOptionsDto } from '../../../libs/common/src/dtos/chain.watch.dto';
import { WebhookRegistrationDto } from '../../../libs/common/src/dtos/subscription.webhook.dto';
import { AnnouncementType } from '../../../libs/common/src/interfaces/dsnp';

@Injectable()
export class ApiService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue,
    private readonly scannerService: ScannerService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  public setLastSeenBlockNumber(blockNumber: bigint) {
    this.logger.warn(`Setting last seen block number to ${blockNumber}`);
    return this.redis.set(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, blockNumber.toString());
  }

  public async setWatchOptions(watchOptions: ChainWatchOptionsDto) {
    this.logger.warn(`Setting watch options to ${JSON.stringify(watchOptions)}`);
    const currentWatchOptions = await this.redis.get(EVENTS_TO_WATCH_KEY);
    this.logger.warn(`Current watch options are ${currentWatchOptions}`);
    await this.redis.set(EVENTS_TO_WATCH_KEY, JSON.stringify(watchOptions));
  }

  public pauseScanner() {
    this.logger.warn('Pausing scanner');
    return this.scannerService.pauseScanner();
  }

  public resumeScanner() {
    this.logger.warn('Resuming scanner');
    return this.scannerService.resumeScanner();
  }

  public async searchContent(contentSearchRequestDto: ContentSearchRequestDto) {
    const jobId = contentSearchRequestDto.id ?? calculateJobId(contentSearchRequestDto);
    this.logger.debug(`Searching for content with request ${JSON.stringify(contentSearchRequestDto)}`);

    const job = await this.requestQueue.getJob(jobId);
    if (job && !(await job.isCompleted())) {
      this.logger.debug(`Found existing job ${jobId}`);
      return job;
    }
    this.requestQueue.remove(jobId);
    const jobPromise = this.requestQueue.add(`Content Search ${jobId}`, contentSearchRequestDto, { jobId });
    this.logger.debug(`Added job ${jobId}`);
    return jobPromise;
  }

  public async setWebhook(webhookRegistration: WebhookRegistrationDto) {
    const webhookId = createHash('sha256').update(webhookRegistration.url).digest('hex');
    this.logger.debug(`Setting webhook ${webhookId} to ${JSON.stringify(webhookRegistration)}`);
    const currentRegistedWebooks = await this.redis.get(REGISTERED_WEBHOOK_KEY);

    let currentWebhookRegistrationDtos: { announcementType: string; urls: string[] }[] = [];
    if (currentRegistedWebooks) {
      currentWebhookRegistrationDtos = JSON.parse(currentRegistedWebooks);
    }

    webhookRegistration.announcementTypes.forEach((announcementType) => {
      const index = currentWebhookRegistrationDtos.findIndex((webhookRegistrationDto) => webhookRegistrationDto.announcementType === announcementType.toLowerCase());
      if (index === -1) {
        currentWebhookRegistrationDtos.push({ announcementType: announcementType.toLowerCase(), urls: [webhookRegistration.url] });
      } else {
        currentWebhookRegistrationDtos[index].urls.push(webhookRegistration.url);
      }
    });

    await this.redis.set(REGISTERED_WEBHOOK_KEY, JSON.stringify(currentWebhookRegistrationDtos));
  }

  public async clearAllWebhooks() {
    this.logger.debug('Clearing all webhooks');
    await this.redis.del(REGISTERED_WEBHOOK_KEY);
  }

  public async getRegisteredWebhooks(): Promise<WebhookRegistrationDto[]> {
    this.logger.debug('Getting registered webhooks');
    const registeredWebhooks = await this.redis.get(REGISTERED_WEBHOOK_KEY);
    return registeredWebhooks ? JSON.parse(registeredWebhooks) : [];
  }
}
