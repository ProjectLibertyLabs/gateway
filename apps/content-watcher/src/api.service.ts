import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScannerService } from '#content-watcher-lib/scanner/scanner.service';
import {
  calculateJobId,
  EVENTS_TO_WATCH_KEY,
  REGISTERED_WEBHOOK_KEY,
  ContentWatcherQueues as QueueConstants,
  STORAGE_EXPIRE_UPPER_LIMIT_SECONDS,
} from '#types/constants';
import { ChainWatchOptionsDto } from '#types/dtos/content-watcher/chain.watch.dto';
import { IWebhookRegistration } from '#types/dtos/content-watcher/subscription.webhook.dto';
import { IScanReset } from '#types/interfaces/content-watcher/scan-reset.interface';
import { IAnnouncementSubscription } from '#types/interfaces/content-watcher/announcement-subscription.interface';
import { ContentSearchRequestDto } from '#types/dtos/content-watcher';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class ApiService {
  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.WATCHER_REQUEST_QUEUE_NAME) private requestQueue: Queue,
    private readonly scannerService: ScannerService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  public async getWatchOptions(): Promise<ChainWatchOptionsDto | null> {
    const options = await this.redis.get(EVENTS_TO_WATCH_KEY);
    return options ? (JSON.parse(options) as ChainWatchOptionsDto) : null;
  }

  public async setWatchOptions(watchOptions: ChainWatchOptionsDto) {
    this.logger.warn(`Setting watch options to ${JSON.stringify(watchOptions)}`);
    const currentWatchOptions = await this.redis.get(EVENTS_TO_WATCH_KEY);
    this.logger.warn(`Current watch options are ${currentWatchOptions}`);
    await this.redis.setex(EVENTS_TO_WATCH_KEY, STORAGE_EXPIRE_UPPER_LIMIT_SECONDS, JSON.stringify(watchOptions));
  }

  public pauseScanner() {
    this.logger.warn('Pausing scanner');
    this.scannerService.pauseScanner();
  }

  public resumeScanner(immediate = false) {
    this.logger.warn('Resuming scanner');
    this.scannerService.resumeScanner(immediate);
  }

  public async resetScanner(resetScannerOptions: IScanReset) {
    await this.scannerService.resetScan(resetScannerOptions);
  }

  public async searchContent(contentSearchRequestDto: ContentSearchRequestDto) {
    const jobId = contentSearchRequestDto.clientReferenceId ?? calculateJobId(contentSearchRequestDto);
    this.logger.debug(`Searching for content with request ${JSON.stringify(contentSearchRequestDto)}`);

    const job = await this.requestQueue.getJob(jobId);
    if (job && !(await job.isCompleted())) {
      this.logger.debug(`Found existing job ${jobId}`);
      return job;
    }
    this.requestQueue.remove(jobId);
    // eslint-disable-next-line no-param-reassign
    contentSearchRequestDto.clientReferenceId = jobId;
    const jobPromise = await this.requestQueue.add(`Content Search ${jobId}`, contentSearchRequestDto, { jobId });
    const JOB_REQUEST_WATCH_KEY = `${EVENTS_TO_WATCH_KEY}:${jobId}`;
    await this.redis.setex(
      JOB_REQUEST_WATCH_KEY,
      STORAGE_EXPIRE_UPPER_LIMIT_SECONDS,
      JSON.stringify(contentSearchRequestDto.filters),
    );
    return jobPromise;
  }

  public async setWebhook(webhookRegistration: IWebhookRegistration) {
    this.logger.debug(`Registering webhook ${JSON.stringify(webhookRegistration)}`);
    const currentRegistedWebooks = await this.redis.get(REGISTERED_WEBHOOK_KEY);

    let currentWebhookRegistrationDtos: IAnnouncementSubscription[] = [];
    if (currentRegistedWebooks) {
      currentWebhookRegistrationDtos = JSON.parse(currentRegistedWebooks);
    }

    webhookRegistration.announcementTypes
      .map((a) => a.toLowerCase())
      .forEach((announcementType) => {
        const existingRegistration = currentWebhookRegistrationDtos.find(
          (currentWebhookRegistration) => currentWebhookRegistration.announcementType === announcementType,
        );
        if (!existingRegistration) {
          currentWebhookRegistrationDtos.push({
            announcementType: announcementType.toLowerCase(),
            urls: [webhookRegistration.url],
          });
        } else {
          const urls = new Set(existingRegistration.urls);
          urls.add(webhookRegistration.url);
          existingRegistration.urls = [...urls];
        }
      });

    await this.redis.set(REGISTERED_WEBHOOK_KEY, JSON.stringify(currentWebhookRegistrationDtos));
  }

  public async clearAllWebhooks() {
    this.logger.debug('Clearing all webhooks');
    await this.redis.del(REGISTERED_WEBHOOK_KEY);
  }

  public async getRegisteredWebhooks(): Promise<IWebhookRegistration[]> {
    this.logger.debug('Getting registered webhooks');
    const registeredWebhooks = await this.redis.get(REGISTERED_WEBHOOK_KEY);
    return registeredWebhooks ? JSON.parse(registeredWebhooks) : [];
  }
}
