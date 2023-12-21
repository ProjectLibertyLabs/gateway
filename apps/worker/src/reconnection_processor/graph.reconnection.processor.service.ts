import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { IGraphUpdateJob, ProviderWebhookService, QueueConstants } from '../../../../libs/common/src';
import { BaseConsumer } from '../BaseConsumer';

@Injectable()
@Processor(QueueConstants.RECONNECT_REQUEST_QUEUE)
export class GraphReconnectionService extends BaseConsumer {
  private webhookOk = true;

  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.RECONNECT_REQUEST_QUEUE) private reconnectRequestQueue: Queue,
    private configService: ConfigService,
    private providerWebhookService: ProviderWebhookService,
  ) {
    super();
  }

  async process(job: Job<IGraphUpdateJob, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      // TODO: add logic to process reconnection job and queue to request processor
      this.logger.debug(job.asJSON());
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  @OnEvent('webhook.unhealthy', { async: true, promisify: true })
  private async handleWebhookGone() {
    this.logger.debug('Received webhook.unhealthy event, pausing reconnection queue');
    await this.reconnectRequestQueue.pause();
  }

  @OnEvent('webhook.healthy', { async: true, promisify: true })
  private async handleWebhookRestored() {
    this.logger.debug('Received webhook.healthy event, resuming reconnection queue');
    await this.reconnectRequestQueue.resume();
  }
}
