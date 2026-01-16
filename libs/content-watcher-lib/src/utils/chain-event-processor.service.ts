import { Injectable } from '@nestjs/common';
import { ChainWatchOptionsDto } from '#types/dtos/content-watcher/chain.watch.dto';
import {
  CommonPrimitivesMessagesBlockPaginationResponse,
  CommonPrimitivesMessagesMessageResponseV2,
  FrameSystemEventRecord,
} from '@polkadot/types/lookup';
import { Vec } from '@polkadot/types';
import { MessageResponseWithIntentId } from '#types/interfaces/content-watcher/message_response_with_schema_id';
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
  ): Promise<MessageResponseWithIntentId[]> {
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
  ): Promise<MessageResponseWithIntentId[]> {
    const hasMessages = events.some(({ event }) => this.blockchainService.events.messages.MessagesInBlock.is(event));
    if (!hasMessages) {
      return [];
    }

    let intentIds = (await this.blockchainService.getMessageKeysInBlock(blockNumber)).map(([intentId, _]) => intentId);
    intentIds = Array.from(new Set<number>(intentIds));
    const filteredEvents: (MessageResponseWithIntentId | null)[] = await Promise.all(
      intentIds.map(async (intentId) => {
        if (filter && filter?.intentIds?.length > 0 && !filter.intentIds.includes(intentId)) {
          return null;
        }
        let paginationRequest: IBlockPaginationRequest = {
          fromBlock: blockNumber,
          fromIndex: 0,
          pageSize: 1000,
          toBlock: blockNumber + 1,
        };

        let messageResponse: CommonPrimitivesMessagesBlockPaginationResponse =
          await this.blockchainService.getMessagesByIntentId(intentId, paginationRequest);
        const messages: Vec<CommonPrimitivesMessagesMessageResponseV2> = messageResponse.content;
        while (messageResponse.hasNext.toHuman()) {
          paginationRequest = {
            fromBlock: blockNumber,
            fromIndex: messageResponse.nextIndex.isSome ? messageResponse.nextIndex.unwrap().toNumber() : 0,
            pageSize: 1000,
            toBlock: blockNumber + 1,
          };
          // eslint-disable-next-line no-await-in-loop
          messageResponse = await this.blockchainService.getMessagesByIntentId(intentId, paginationRequest);
          if (messageResponse.content.length > 0) {
            messages.push(...messageResponse.content);
          }
        }
        const messagesWithSchemaId: MessageResponseWithIntentId = {
          intentId: intentId,
          messages,
        };
        return messagesWithSchemaId;
      }),
    );
    const collectedMessages: MessageResponseWithIntentId[] = [];
    filteredEvents.forEach((event) => {
      if (event) {
        collectedMessages.push(event);
      }
    });
    return collectedMessages;
  }

  public static async queueIPFSJobs(
    messages: MessageResponseWithIntentId[],
    queue: Queue,
    requestId?: string,
    webhookUrl?: string,
  ): Promise<void> {
    const jobs = messages.flatMap((messageResponse) =>
      messageResponse.messages
        .filter((message) => message.cid && message.cid.isSome)
        .map((message) => {
          const job = createIPFSQueueJob(
            message.blockNumber.toNumber(),
            message.msaId.isNone ? message.providerMsaId.toString() : message.msaId.unwrap().toString(),
            message.providerMsaId.toString(),
            messageResponse.intentId,
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
