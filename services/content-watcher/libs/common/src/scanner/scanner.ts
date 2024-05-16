/* eslint-disable no-underscore-dangle */
import '@frequency-chain/api-augment';
import { BlockPaginationResponseMessage, MessageResponse } from '@frequency-chain/api-augment/interfaces';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from 'time-constants';
import { Vec } from '@polkadot/types';
import { Queue } from 'bullmq';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { ConfigService } from '../config/config.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import * as QueueConstants from '../utils/queues';
import { EVENTS_TO_WATCH_KEY, LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, REGISTERED_WEBHOOK_KEY } from '../constants';
import { ChainWatchOptionsDto } from '../dtos/chain.watch.dto';
import { createIPFSQueueJob } from '../interfaces/ipfs.job.interface';
import * as RedisUtils from '../utils/redis';
import { MessageResponseWithSchemaId } from '../interfaces/message_response_with_schema_id';
import { ApiDecoration } from '@polkadot/api/types';

@Injectable()
export class ScannerService implements OnApplicationBootstrap {
  private readonly logger: Logger;

  private scanInProgress = false;

  private paused = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly blockchainService: BlockchainService,
    @InjectRedis() private readonly cache: Redis,
    @InjectQueue(QueueConstants.IPFS_QUEUE) private readonly ipfsQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.logger = new Logger(ScannerService.name);
  }

  async onApplicationBootstrap() {
    const startingBlock = Number(this.configService.startingBlock) - 1;
    this.setLastSeenBlockNumber(startingBlock);
    this.scheduleInitialScan();
    this.scheduleBlockchainScan();
  }

  private scheduleInitialScan() {
    const initialTimeout = setTimeout(() => this.scan(), 0);
    this.schedulerRegistry.addTimeout('initialScan', initialTimeout);
  }

  private scheduleBlockchainScan() {
    const scanInterval = this.configService.blockchainScanIntervalMinutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

    const interval = setInterval(() => this.scan(), scanInterval);
    this.schedulerRegistry.addInterval('blockchainScan', interval);
  }

  public async pauseScanner() {
    this.logger.debug('Pausing scanner');
    this.paused = true;
  }

  public async resumeScanner() {
    this.logger.debug('Resuming scanner');
    this.paused = false;
  }

  async scan() {
    try {
      this.logger.debug('Starting scanner');

      if (this.scanInProgress) {
        this.logger.debug('Scan already in progress');
        return;
      }

      if (this.paused) {
        this.logger.debug('Scanner is paused');
        return;
      }
      let queueSize = await this.ipfsQueue.count();

      if (queueSize > 0) {
        this.logger.log('Deferring next blockchain scan until queue is empty');
        return;
      }
      const registeredWebhook = await this.cache.get(REGISTERED_WEBHOOK_KEY);

      if (!registeredWebhook) {
        this.logger.log('No registered webhooks; no scan performed.');
        return;
      }
      const chainWatchFilters = await this.cache.get(EVENTS_TO_WATCH_KEY);
      const eventsToWatch: ChainWatchOptionsDto = chainWatchFilters ? JSON.parse(chainWatchFilters) : { msa_ids: [], schemaIds: [] };

      this.scanInProgress = true;
      let lastScannedBlock = await this.getLastSeenBlockNumber();
      const currentBlockNumber = lastScannedBlock + 1;
      let latestBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);

      if (!latestBlockHash.some((byte) => byte !== 0)) {
        this.logger.log('No new blocks to read; no scan performed.');
        this.scanInProgress = false;
        return;
      }
      this.logger.log(`Starting scan from block #${currentBlockNumber} (${latestBlockHash})`);

      while (!this.paused && !latestBlockHash.isEmpty && queueSize < this.configService.queueHighWater) {
        // eslint-disable-next-line no-await-in-loop
        const at = await this.blockchainService.apiPromise.at(latestBlockHash.toHex());
        // eslint-disable-next-line no-await-in-loop
        const events = await at.query.system.events();
        // eslint-disable-next-line no-await-in-loop
        const messages = await this.processEvents(at, lastScannedBlock, events, eventsToWatch);
        if (messages.length > 0) {
          this.logger.debug(`Found ${messages.length} messages to process`);
        }
        // eslint-disable-next-line no-await-in-loop
        await this.queueIPFSJobs(messages);
        // eslint-disable-next-line no-await-in-loop
        await this.saveProgress(lastScannedBlock);
        lastScannedBlock += 1;
        // eslint-disable-next-line no-await-in-loop
        latestBlockHash = await this.blockchainService.getBlockHash(lastScannedBlock);
        // eslint-disable-next-line no-await-in-loop
        queueSize = await this.ipfsQueue.count();
      }
      if (latestBlockHash.isEmpty) {
        this.logger.log(`Scan reached end-of-chain at block ${lastScannedBlock - 1}`);
      } else if (queueSize > this.configService.queueHighWater) {
        this.logger.log('Queue soft limit reached; pausing scan until next iteration');
      }
    } catch (err) {
      this.logger.error(err);
    } finally {
      this.scanInProgress = false;
    }
  }

  private async processEvents(
    apiAt: ApiDecoration<'promise'>,
    blockNumber: number,
    events: Vec<FrameSystemEventRecord>,
    eventsToWatch: ChainWatchOptionsDto,
  ): Promise<MessageResponseWithSchemaId[]> {
    const hasMessages = events.some(({ event }) => apiAt.events.messages.MessagesInBlock.is(event));
    if (!hasMessages) {
      return [];
    }

    const keys = await apiAt.query.messages.messagesV2.keys(blockNumber);
    let schemaIds = keys.map((key) => key.args[1].toString());
    schemaIds = Array.from(new Set(...schemaIds));
    const filteredEvents: (MessageResponseWithSchemaId | null)[] = await Promise.all(
      schemaIds.map(async (schemaId) => {
        if (eventsToWatch?.schemaIds?.length > 0 && !eventsToWatch.schemaIds.includes(schemaId)) {
          return null;
        }
        let paginationRequest = {
          from_block: blockNumber,
          from_index: 0,
          page_size: 1000,
          to_block: blockNumber + 1,
        };

        let messageResponse: BlockPaginationResponseMessage = await this.blockchainService.apiPromise.rpc.messages.getBySchemaId(schemaId, paginationRequest);
        const messages: Vec<MessageResponse> = messageResponse.content;
        while (messageResponse.has_next.toHuman()) {
          paginationRequest = {
            from_block: blockNumber,
            from_index: messageResponse.next_index.isSome ? messageResponse.next_index.unwrap().toNumber() : 0,
            page_size: 1000,
            to_block: blockNumber + 1,
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

  private async queueIPFSJobs(messages: MessageResponseWithSchemaId[]): Promise<void> {
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
            '',
          );

          return {
            name: `IPFS Job: ${job.key}`,
            data: job.data,
            opts: { jobId: job.key },
          };
        }),
    );

    if (jobs && jobs.length > 0) {
      await this.ipfsQueue.addBulk(jobs);
    }
  }

  private async getLastSeenBlockNumber(): Promise<number> {
    return Number((await this.cache.get(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY)) ?? 0);
  }

  private async saveProgress(blockNumber: number): Promise<void> {
    await this.setLastSeenBlockNumber(blockNumber);
  }

  private async setLastSeenBlockNumber(b: number): Promise<void> {
    await this.cache.setex(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, RedisUtils.STORAGE_EXPIRE_UPPER_LIMIT_SECONDS, b);
  }
}
