import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { GraphChangeRepsonseDto, ProviderGraphDto, QueueConstants } from '../../../libs/common/src';

@Injectable()
export class ApiService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private graphChangeRequestQueue: Queue,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async enqueueRequest(request: ProviderGraphDto): Promise<GraphChangeRepsonseDto> {
    const data = {
      ...request,
      id: this.calculateJobId(request),
    };
    const job = await this.graphChangeRequestQueue.add(`Request Job - ${data.id}`, data, { jobId: data.id, removeOnFail: false, removeOnComplete: 2000 }); // TODO: should come from queue configs
    this.logger.debug(job);
    return {
      referenceId: data.id,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: ProviderGraphDto): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }
}
