/* eslint-disable no-underscore-dangle */
import { Injectable } from '@nestjs/common';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { u16, u32 } from '@polkadot/types';
import { SchemaId } from '@frequency-chain/api-augment/interfaces';
import { Job, Queue } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { BlockNumber } from '@polkadot/types/interfaces';
import { BlockchainService } from '../blockchain/blockchain.service';
import { QueueConstants } from '../utils/queues';
import { ChainWatchOptionsDto } from '../dtos/chain.watch.dto';
import { createIPFSQueueJob } from '../interfaces/ipfs.job.interface';
import { BaseConsumer } from '../utils/base-consumer';
import { ContentSearchRequestDto } from '../dtos/request-job.dto';

@Injectable()
@Processor(QueueConstants.REQUEST_QUEUE_NAME, {
  concurrency: 2,
})
export class CrawlerService extends BaseConsumer {
  constructor(
    private readonly blockchainService: BlockchainService,
    @InjectRedis() private readonly cache: Redis,
    @InjectQueue(QueueConstants.IPFS_QUEUE) private readonly ipfsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ContentSearchRequestDto, any, string>): Promise<any> {
    this.logger.log(`Processing crawler job ${job.id}`);
    const blockList: bigint[] = [];
    const blockStart = BigInt(job.data.startBlock);
    const blockEnd = BigInt(job.data.endBlock);
    for (let i = blockStart; i <= blockEnd; i += 1n) {
      blockList.push(BigInt(i));
    }
    await this.processBlockList(job.data.id, blockList, job.data.filters);

    this.logger.log(`Finished processing job ${job.id}`);
  }

  private async processBlockList(id: string, blockList: bigint[], filters: ChainWatchOptionsDto) {
    const promises: Promise<void>[] = [];

    blockList.forEach(async (blockNumber) => {
      const latestBlockHash = await this.blockchainService.getBlockHash(blockNumber);
      if (latestBlockHash.isEmpty) {
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      const events = await this.fetchEventsFromBlockchain(latestBlockHash);
      this.logger.debug(`Processing ${events.length} events for block ${blockNumber}`);

      // eslint-disable-next-line no-await-in-loop
      const filteredEvents = await this.processEvents(events, filters);
      if (filteredEvents.length === 0) {
        this.logger.debug(`No events found for block ${blockNumber}`);
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.queueIPFSJobs(id, filteredEvents);

      promises.push(Promise.resolve());
    });

    await Promise.all(promises);
  }

  private async fetchEventsFromBlockchain(latestBlockHash: any) {
    return (await this.blockchainService.queryAt(latestBlockHash, 'system', 'events')).toArray();
  }

  private async processEvents(events: any, eventsToWatch: ChainWatchOptionsDto) {
    const filteredEvents = await Promise.all(
      events.map(async (event) => {
        if (event.section === 'messages' && event.method === 'MessagesStored') {
          if (eventsToWatch.schemaIds.length > 0 && !eventsToWatch.schemaIds.includes(event.data[0].toString())) {
            return null;
          }

          const schemaId = event.data[0] as SchemaId;
          const blockNumber = event.data[1] as BlockNumber;
          const paginationRequest = {
            from_block: blockNumber.toBigInt(),
            from_index: 0,
            page_size: 1000,
            to_block: blockNumber.toBigInt() + 1n,
          };

          const messageResponse = await this.blockchainService.apiPromise.rpc.messages.getBySchemaId(schemaId, paginationRequest);
          const senderMsaId = messageResponse.msa_id.unwrap().toString();
          const providerMsaId = messageResponse.provider_msa_id.unwrap().toString();

          if (eventsToWatch.dsnpIds.length === 0 || eventsToWatch.dsnpIds.includes(senderMsaId) || eventsToWatch.dsnpIds.includes(providerMsaId)) {
            return event;
          }
        }
        return null;
      }),
    );

    return filteredEvents.filter((event) => event !== null);
  }

  private async queueIPFSJobs(id: string, events) {
    const jobs = events.map(async (event) => {
      const schemaId: u16 = event.data?.schemaId;
      const blockNumber: u32 = event.data?.blockNumber;
      const paginationRequest = {
        from_block: blockNumber.toBigInt(),
        from_index: 0,
        page_size: 1000,
        to_block: blockNumber.toBigInt() + 1n,
      };

      // eslint-disable-next-line no-await-in-loop
      const messageResponse = await firstValueFrom(this.blockchainService.api.rpc.messages.getBySchemaId(schemaId, paginationRequest));

      if (messageResponse.cid.isNone) {
        return;
      }

      const ipfsQueueJob = createIPFSQueueJob(
        messageResponse.msa_id.unwrap().toString(),
        messageResponse.provider_msa_id.unwrap().toString(),
        blockNumber.toBigInt(),
        messageResponse.cid.unwrap().toString(),
        messageResponse.index.toNumber(),
        id,
      );

      // eslint-disable-next-line no-await-in-loop
      await this.ipfsQueue.add(`IPFS Job: ${ipfsQueueJob.key}`, ipfsQueueJob.data, { jobId: ipfsQueueJob.key });
    });
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(jobs);
  }
}
