import { Injectable } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ChainWatchOptionsDto } from '../dtos/chain.watch.dto';
import { ApiDecoration } from '@polkadot/api/types';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { Vec } from '@polkadot/types';
import { BlockPaginationResponseMessage, MessageResponse } from '@frequency-chain/api-augment/interfaces';
import { MessageResponseWithSchemaId } from '../interfaces/message_response_with_schema_id';
import { createIPFSQueueJob } from '../interfaces/ipfs.job.interface';
import { Queue } from 'bullmq';

@Injectable()
export class ChainEventProcessorService {
  constructor(private readonly blockchainService: BlockchainService) {}

  public async getMessagesInBlock(
    blockNumber: number,
    filter?: ChainWatchOptionsDto,
  ): Promise<MessageResponseWithSchemaId[]> {
    const blockHash = await this.blockchainService.getBlockHash(blockNumber);
    if (blockHash.isEmpty) {
      return [];
    }
    const apiAt = await this.blockchainService.apiPromise.at(blockHash);
    const events = await apiAt.query.system.events();
    return this.getMessagesFromEvents(apiAt, blockNumber, events, filter);
  }

  private async getMessagesFromEvents(
    apiAt: ApiDecoration<'promise'>,
    blockNumber: number,
    events: Vec<FrameSystemEventRecord>,
    filter?: ChainWatchOptionsDto,
  ): Promise<MessageResponseWithSchemaId[]> {
    const hasMessages = events.some(({ event }) => apiAt.events.messages.MessagesInBlock.is(event));
    if (!hasMessages) {
      return [];
    }

    const keys = await apiAt.query.messages.messagesV2.keys(blockNumber);
    let schemaIds = keys.map((key) => key.args[1].toNumber());
    schemaIds = Array.from(new Set<number>(schemaIds));
    const filteredEvents: (MessageResponseWithSchemaId | null)[] = await Promise.all(
      schemaIds.map(async (schemaId) => {
        if (filter && filter?.schemaIds?.length > 0 && !filter.schemaIds.includes(schemaId)) {
          return null;
        }
        let paginationRequest = {
          from_block: blockNumber,
          from_index: 0,
          page_size: 1000,
          to_block: blockNumber + 1,
        };

        let messageResponse: BlockPaginationResponseMessage =
          await this.blockchainService.apiPromise.rpc.messages.getBySchemaId(schemaId, paginationRequest);
        const messages: Vec<MessageResponse> = messageResponse.content;
        while (messageResponse.has_next.toHuman()) {
          paginationRequest = {
            from_block: blockNumber,
            from_index: messageResponse.next_index.isSome ? messageResponse.next_index.unwrap().toNumber() : 0,
            page_size: 1000,
            to_block: blockNumber + 1,
          };
          // eslint-disable-next-line no-await-in-loop
          messageResponse = await this.blockchainService.apiPromise.rpc.messages.getBySchemaId(
            schemaId,
            paginationRequest,
          );
          if (messageResponse.content.length > 0) {
            messages.push(...messageResponse.content);
          }
        }
        const messagesWithSchemaId: MessageResponseWithSchemaId = {
          schemaId: schemaId,
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

  public async queueIPFSJobs(messages: MessageResponseWithSchemaId[], queue: Queue, requestId?: string): Promise<void> {
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
