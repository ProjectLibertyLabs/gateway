/* eslint-disable no-underscore-dangle */
import { Injectable } from '@nestjs/common';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { DelayedError, Job, Queue } from 'bullmq';
import { ContentWatcherQueues as QueueConstants } from '#types/constants/queue.constants';
import { ChainWatchOptionsDto } from '#types/dtos/content-watcher/chain.watch.dto';
import { BaseConsumer } from '#consumer';
import { ContentSearchRequestDto } from '#types/dtos/content-watcher/content-search-request.dto';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { ChainEventProcessorService } from '#content-watcher-lib/utils/chain-event-processor.service';

const CRAWLER_BLOCK_CHUNK_SIZE = 500;

@Injectable()
@Processor(QueueConstants.WATCHER_REQUEST_QUEUE_NAME, {
  concurrency: 2,
})
export class CrawlerService extends BaseConsumer {
  constructor(
    @InjectRedis() private readonly cache: Redis,
    @InjectQueue(QueueConstants.WATCHER_IPFS_QUEUE) private readonly ipfsQueue: Queue,
    private readonly chainEventService: ChainEventProcessorService,
    private readonly blockchainService: BlockchainRpcQueryService,
  ) {
    super();
  }

  async process(job: Job<ContentSearchRequestDto, any, string>): Promise<void> {
    this.logger.log(`Processing crawler job ${job.id}: ${JSON.stringify(job.data)}`);

    try {
      let { startBlock } = job.data;
      if (!startBlock) {
        startBlock = await this.blockchainService.getLatestFinalizedBlockNumber();
        // eslint-disable-next-line no-param-reassign
        job.data.startBlock = startBlock;
        this.logger.debug(`No starting block specified; starting from end of chain at block ${startBlock}`);
      }
      // Make sure blockCount is not longer than the current chain length
      if (job.data.blockCount >= startBlock) {
        // eslint-disable-next-line no-param-reassign
        job.data.blockCount = startBlock;
      }
      let blockList = new Array(job.data.blockCount).fill(0).map((_v, index) => startBlock - index);
      blockList.reverse();

      // Process block list in chunks so as not to overload the async queue
      await this.processBlockList(
        job.data.clientReferenceId,
        blockList.slice(0, CRAWLER_BLOCK_CHUNK_SIZE),
        job.data.filters,
      );
      blockList = blockList.slice(CRAWLER_BLOCK_CHUNK_SIZE);

      if (blockList.length > 0) {
        // eslint-disable-next-line no-param-reassign
        job.data.blockCount = blockList.length;
        await job.updateData(job.data);
        await job.moveToDelayed(Date.now());
        throw new DelayedError();
      }

      this.logger.log(`Finished processing job ${job.id}`);
    } catch (error) {
      if (error instanceof DelayedError) {
        throw error;
      }

      this.logger.error(`Error processing crawler search job: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  private async processBlockList(clientReferenceId: string, blockList: number[], filters: ChainWatchOptionsDto) {
    this.logger.debug(`Processing block list ${Math.min(...blockList)}...${Math.max(...blockList)}`);
    await Promise.all(
      blockList.map(async (blockNumber) => {
        const messages = await this.chainEventService.getMessagesInBlock(blockNumber, filters);
        if (messages.length > 0) {
          this.logger.debug(`Found ${messages.length} messages for block ${blockNumber}`);
        }
        // eslint-disable-next-line no-await-in-loop
        await ChainEventProcessorService.queueIPFSJobs(messages, this.ipfsQueue, clientReferenceId);
      }),
    );
  }
}
