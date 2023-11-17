/* eslint-disable no-underscore-dangle */
import { Injectable } from '@nestjs/common';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Vec, u16, u32 } from '@polkadot/types';
import { BlockPaginationResponseMessage, MessageResponse, SchemaId } from '@frequency-chain/api-augment/interfaces';
import { Job, Queue } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { BlockNumber } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { BlockchainService } from '../blockchain/blockchain.service';
import { QueueConstants } from '../utils/queues';
import { ChainWatchOptionsDto } from '../dtos/chain.watch.dto';
import { createIPFSQueueJob } from '../interfaces/ipfs.job.interface';
import { BaseConsumer } from '../utils/base-consumer';
import { ContentSearchRequestDto } from '../dtos/request-job.dto';
import { REGISTERED_WEBHOOK_KEY } from '../constants';
import { MessageResponseWithSchemaId } from '../interfaces/announcement_response';

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
    const registeredWebhook = await this.cache.get(REGISTERED_WEBHOOK_KEY);

    if (!registeredWebhook) {
      throw new Error('No registered webhook to send data to');
    }
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
      const messages = await this.processEvents(events, filters);
      if (messages.length > 0) {
        this.logger.debug(`Found ${messages.length} messages for block ${blockNumber}`);
      }
      // eslint-disable-next-line no-await-in-loop
      await this.queueIPFSJobs(id, messages);

      promises.push(Promise.resolve());
    });

    await Promise.all(promises);
  }

  private async fetchEventsFromBlockchain(latestBlockHash: any) {
    return (await this.blockchainService.queryAt(latestBlockHash, 'system', 'events')).toArray();
  }

  private async processEvents(events: Vec<FrameSystemEventRecord>, eventsToWatch: ChainWatchOptionsDto): Promise<MessageResponseWithSchemaId[]> {
    const filteredEvents: (MessageResponseWithSchemaId | null)[] = await Promise.all(
      events.map(async (event) => {
        if (event.event.section === 'messages' && event.event.method === 'MessagesStored') {
          if (eventsToWatch.schemaIds.length > 0 && !eventsToWatch.schemaIds.includes(event.event.data[0].toString())) {
            return null;
          }
          const schemaId = event.event.data[0] as SchemaId;
          const blockNumber = event.event.data[1] as BlockNumber;
          let paginationRequest = {
            from_block: blockNumber.toBigInt(),
            from_index: 0,
            page_size: 1000,
            to_block: blockNumber.toBigInt() + 1n,
          };

          let messageResponse: BlockPaginationResponseMessage = await this.blockchainService.apiPromise.rpc.messages.getBySchemaId(schemaId, paginationRequest);
          const messages: Vec<MessageResponse> = messageResponse.content;
          while (messageResponse.has_next.toHuman()) {
            paginationRequest = {
              from_block: blockNumber.toBigInt(),
              from_index: messageResponse.next_index.isSome ? messageResponse.next_index.unwrap().toNumber() : 0,
              page_size: 1000,
              to_block: blockNumber.toBigInt() + 1n,
            };
            // eslint-disable-next-line no-await-in-loop
            messageResponse = await this.blockchainService.apiPromise.rpc.messages.getBySchemaId(schemaId, paginationRequest);
            if (messageResponse.content.length > 0) {
              messages.push(...messageResponse.content);
            }
          }
          const messagesWithSchemaId: MessageResponseWithSchemaId = {
            schemaId: schemaId.toString(),
            messages,
          };
          return messagesWithSchemaId;
        }
        return null;
      }),
    );
    const collectedMessages: MessageResponseWithSchemaId[] = [];
    filteredEvents.forEach((event) => {
      if (event) {
        collectedMessages.push(event);
      }
    });

    return collectedMessages;
  }

  private async queueIPFSJobs(requestId: string, messages: MessageResponseWithSchemaId[]): Promise<void> {
    const promises = messages.map(async (messageResponse) => {
      const { schemaId } = messageResponse;
      const innerPromises = messageResponse.messages.map(async (message) => {
        if (!message.cid || message.cid.isNone) {
          return;
        }

        const ipfsQueueJob = createIPFSQueueJob(
          message.msa_id.isNone ? message.provider_msa_id.toString() : message.msa_id.unwrap().toString(),
          message.provider_msa_id.toString(),
          schemaId,
          message.cid.unwrap().toString(),
          message.index.toNumber(),
          requestId,
        );
        // eslint-disable-next-line no-await-in-loop
        await this.ipfsQueue.add(`IPFS Job: ${ipfsQueueJob.key}`, ipfsQueueJob.data, { jobId: ipfsQueueJob.key });
      });

      // eslint-disable-next-line no-await-in-loop
      await Promise.all(innerPromises);
    });

    await Promise.all(promises);
  }
}
