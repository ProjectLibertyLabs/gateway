import { Injectable } from '@nestjs/common';
import { ChainWatchOptionsDto } from '#types/dtos/content-watcher/chain.watch.dto';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { Vec } from '@polkadot/types';
import { BlockPaginationResponseMessage, MessageResponse } from '@frequency-chain/api-augment/interfaces';
import { MessageResponseWithSchemaId } from '#types/interfaces/content-watcher/message_response_with_schema_id';
import { createIPFSQueueJob } from '#types/interfaces/content-watcher/ipfs.job.interface';
import { Queue } from 'bullmq';
import { BlockchainRpcQueryService, IBlockPaginationRequest } from '#blockchain/blockchain-rpc-query.service';

@Injectable()
export class ChainEventProcessorService {
  // eslint-disable-next-line no-empty-function
  constructor(private readonly blockchainService: BlockchainRpcQueryService) {}

  public async getMessagesInBlock(
    blockNumber: number,
    filter?: ChainWatchOptionsDto,
  ): Promise<MessageResponseWithSchemaId[]> {
    console.warn('about to getBlockHash');
    const blockHash = await this.blockchainService.getBlockHash(blockNumber);
    if (blockHash.isEmpty) {
      return [];
    }
    const events = await this.blockchainService.getEvents(blockHash);
    return this.getMessagesFromEvents(blockNumber, events, filter);
  }

  private async getMessagesFromEvents(
    blockNumber: number,
    events: FrameSystemEventRecord[],
    filter?: ChainWatchOptionsDto,
  ): Promise<MessageResponseWithSchemaId[]> {
    const hasMessages = events.some(({ event }) => this.blockchainService.events.messages.MessagesInBlock.is(event));
    if (!hasMessages) {
      return [];
    }

    let schemaIds = (await this.blockchainService.getMessageKeysInBlock(blockNumber)).map(([schemaId, _]) => schemaId);
    schemaIds = Array.from(new Set<number>(schemaIds));
    const filteredEvents: (MessageResponseWithSchemaId | null)[] = await Promise.all(
      schemaIds.map(async (schemaId) => {
        if (filter && filter?.schemaIds?.length > 0 && !filter.schemaIds.includes(schemaId)) {
          return null;
        }
        let paginationRequest: IBlockPaginationRequest = {
          from_block: blockNumber,
          from_index: 0,
          page_size: 1000,
          to_block: blockNumber + 1,
        };

        let messageResponse: BlockPaginationResponseMessage = await this.blockchainService.getMessagesBySchemaId(
          schemaId,
          paginationRequest,
        );
        const messages: Vec<MessageResponse> = messageResponse.content;
        while (messageResponse.has_next.toHuman()) {
          paginationRequest = {
            from_block: blockNumber,
            from_index: messageResponse.next_index.isSome ? messageResponse.next_index.unwrap().toNumber() : 0,
            page_size: 1000,
            to_block: blockNumber + 1,
          };
          // eslint-disable-next-line no-await-in-loop
          messageResponse = await this.blockchainService.getMessagesBySchemaId(schemaId, paginationRequest);
          if (messageResponse.content.length > 0) {
            messages.push(...messageResponse.content);
          }
        }
        const messagesWithSchemaId: MessageResponseWithSchemaId = {
          schemaId,
          messages,
        };
        return messagesWithSchemaId;
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

  public static async queueIPFSJobs(
    messages: MessageResponseWithSchemaId[],
    queue: Queue,
    requestId?: string,
    webhookUrl?: string,
  ): Promise<void> {
    const jobs = messages.flatMap((messageResponse) =>
      messageResponse.messages
        .filter((message) => message.cid && message.cid.isSome)
        .map((message) => {
          const job = createIPFSQueueJob(
            message.block_number.toNumber(),
            message.msa_id.isNone ? message.provider_msa_id.toString() : message.msa_id.unwrap().toString(),
            message.provider_msa_id.toString(),
            messageResponse.schemaId,
            message.cid.unwrap().toString(),
            message.index.toNumber(),
            requestId,
            webhookUrl,
          );

          return {
            name: `IPFS Job: ${job.key}`,
            data: job.data,
            opts: { jobId: job.key },
          };
        }),
    );

    if (jobs && jobs.length > 0) {
      await queue.addBulk(jobs);
    }
  }
}
