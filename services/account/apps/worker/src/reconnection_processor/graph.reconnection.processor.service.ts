import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { IGraphUpdateJob, QueueConstants } from '../../../../libs/common/src';
import { BaseConsumer } from '../BaseConsumer';

@Injectable()
@Processor(QueueConstants.RECONNECT_REQUEST_QUEUE)
export class GraphReconnectionService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    private configService: ConfigService,
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
}
