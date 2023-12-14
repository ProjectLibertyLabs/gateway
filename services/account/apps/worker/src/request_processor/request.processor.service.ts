import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { ProviderGraphDto, QueueConstants } from '../../../../libs/common/src';
import { BaseConsumer } from '../BaseConsumer';

@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE)
export class RequestProcessorService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    private configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ProviderGraphDto, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      // TODO: add logic to process graph change requests
      this.logger.debug(job.asJSON());
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
