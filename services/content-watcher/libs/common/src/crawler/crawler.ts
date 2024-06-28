/* eslint-disable no-underscore-dangle */
import { Injectable } from '@nestjs/common';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Job, Queue } from 'bullmq';
import * as QueueConstants from '../utils/queues';
import { ChainWatchOptionsDto } from '../dtos/chain.watch.dto';
import { BaseConsumer } from '../utils/base-consumer';
import { ContentSearchRequestDto } from '../dtos/request-job.dto';
import { REGISTERED_WEBHOOK_KEY } from '../constants';
import { ChainEventProcessorService } from '../blockchain/chain-event-processor.service';

@Injectable()
@Processor(QueueConstants.REQUEST_QUEUE_NAME, {
  concurrency: 2,
})
export class CrawlerService extends BaseConsumer {
  constructor(
    @InjectRedis() private readonly cache: Redis,
    @InjectQueue(QueueConstants.IPFS_QUEUE) private readonly ipfsQueue: Queue,
    private readonly chainEventService: ChainEventProcessorService,
  ) {
    super();
  }

  async process(job: Job<ContentSearchRequestDto, any, string>): Promise<void> {
    this.logger.log(`Processing crawler job ${job.id}`);
    const registeredWebhook = await this.cache.get(REGISTERED_WEBHOOK_KEY);

    if (!registeredWebhook) {
      throw new Error('No registered webhook to send data to');
    }
    const blockList: number[] = [];
    for (let i = job.data.startBlock; i <= job.data.endBlock; i += 1) {
      blockList.push(i);
    }
    await this.processBlockList(job.data.id, blockList, job.data.filters);

    this.logger.log(`Finished processing job ${job.id}`);
  }

  private async processBlockList(id: string, blockList: number[], filters: ChainWatchOptionsDto) {
    await Promise.all(
      blockList.map(async (blockNumber) => {
        const messages = await this.chainEventService.getMessagesInBlock(blockNumber, filters);
        if (messages.length > 0) {
          this.logger.debug(`Found ${messages.length} messages for block ${blockNumber}`);
        }
        // eslint-disable-next-line no-await-in-loop
        await this.chainEventService.queueIPFSJobs(messages, this.ipfsQueue, id);
      }),
    );
  }
}
