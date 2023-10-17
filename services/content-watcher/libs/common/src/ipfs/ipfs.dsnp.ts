import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { SchedulerRegistry } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { ConfigService } from '../config/config.service';
import { Announcement } from '../interfaces/dsnp';
import { RedisUtils } from '../utils/redis';
import { DsnpSchemas } from '../utils/dsnp.schema';
import { QueueConstants } from '..';
import { IIPFSJob } from '../interfaces/ipfs.job.interface';
import { BaseConsumer } from '../utils/base-consumer';

@Injectable()
@Processor(QueueConstants.IPFS_QUEUE, {
  concurrency: 2,
})
export class IPFSContentProcessor extends BaseConsumer {
  public logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<IIPFSJob, any, string>): Promise<any> {
    this.logger.log(`IPFS Processing job ${job.id}`);
  }
}
