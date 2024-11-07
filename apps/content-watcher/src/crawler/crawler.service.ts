 
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

    // we crawl the blocks in reverse because we can not determine how many blocks back
    // we can access from the node
    try {
      let { upperBoundBlock } = job.data;
      const latestBlock = await this.blockchainService.getLatestFinalizedBlockNumber();
      if (!upperBoundBlock) {
        upperBoundBlock = latestBlock;
        this.logger.debug(`No starting block specified; starting from end of chain at block ${upperBoundBlock}`);
      }
      upperBoundBlock = Math.min(upperBoundBlock, latestBlock);
       
      job.data.upperBoundBlock = upperBoundBlock;
      // Make sure blockCount is not longer than the current chain length
      if (job.data.blockCount >= upperBoundBlock) {
         
        job.data.blockCount = upperBoundBlock;
      }
      this.logger.debug(`Searching backwards from ${upperBoundBlock} for ${job.data.blockCount} blocks!`);
      let blockList = new Array(job.data.blockCount).fill(0).map((_v, index) => upperBoundBlock - index);
      blockList.reverse();

      // Process block list in chunks so as not to overload the async queue
      await this.processBlockList(
        job.data.clientReferenceId,
        blockList.slice(0, CRAWLER_BLOCK_CHUNK_SIZE),
        job.data.filters,
        job.data.webhookUrl,
      );
      blockList = blockList.slice(CRAWLER_BLOCK_CHUNK_SIZE);

      if (blockList.length > 0) {
         
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

  private async processBlockList(
    clientReferenceId: string,
    blockList: number[],
    filters: ChainWatchOptionsDto,
    webHookUrl: string,
  ) {
    this.logger.debug(`Processing block list ${Math.min(...blockList)}...${Math.max(...blockList)}`);
    await Promise.all(
      blockList.map(async (blockNumber) => {
        const messages = await this.chainEventService.getMessagesInBlock(blockNumber, filters);
        if (messages.length > 0) {
          this.logger.debug(`Found ${messages.length} messages for block ${blockNumber}`);
        }
         
        await ChainEventProcessorService.queueIPFSJobs(messages, this.ipfsQueue, clientReferenceId, webHookUrl);
      }),
    );
  }
}
