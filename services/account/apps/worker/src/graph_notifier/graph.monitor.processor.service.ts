import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { QueueConstants } from '../../../../libs/common/src';
import { BaseConsumer } from '../BaseConsumer';
import { ITxMonitorJob } from '../../../../libs/common/src/dtos/graph.notifier.job';

@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_NOTIFY_QUEUE)
export class GraphNotifierService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    private configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ITxMonitorJob, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      // TODO: add logic to process graph tx checks and subsequent notifications
      this.logger.debug(job.asJSON());
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getWebhookList(dsnpId: string): Promise<string[]> {
    const redisKey = `${QueueConstants.REDIS_WATCHER_PREFIX}:${dsnpId}`;
    const redisList = await this.cacheManager.lrange(redisKey, 0, -1);

    return redisList || [];
  }
}
