/* eslint-disable no-underscore-dangle */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from 'time-constants';
import { Vec } from '@polkadot/types';
import { BlockPaginationResponseMessage, MessageResponse, SchemaId } from '@frequency-chain/api-augment/interfaces';
import { Queue } from 'bullmq';
import { BlockNumber } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { ConfigService } from '../config/config.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { QueueConstants } from '../utils/queues';
import { EVENTS_TO_WATCH_KEY, LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY } from '../constants';
import { ChainWatchOptionsDto } from '../dtos/chain.watch.dto';
import { createIPFSQueueJob } from '../interfaces/ipfs.job.interface';

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
    const startingBlock = BigInt(this.configService.startingBlock) - 1n;
    this.setLastSeenBlockNumber(startingBlock);
    this.scheduleInitialScan();
    this.scheduleBlockchainScan();
  }

  private scheduleInitialScan() {
    const initialTimeout = setTimeout(() => this.scan(), 0);
    this.schedulerRegistry.addTimeout('initialScan', initialTimeout);
  }

  private scheduleBlockchainScan() {
    const scanInterval = this.configService.getBlockchainScanIntervalMinutes() * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

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

      const chainWatchFilters = await this.cache.get(EVENTS_TO_WATCH_KEY);
      const eventsToWatch: ChainWatchOptionsDto = chainWatchFilters ? JSON.parse(chainWatchFilters) : { msa_ids: [], schemaIds: [] };

      this.scanInProgress = true;
      let lastScannedBlock = await this.getLastSeenBlockNumber();
      const currentBlockNumber = lastScannedBlock + 1n;
      let latestBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);

      if (!latestBlockHash.some((byte) => byte !== 0)) {
        this.logger.log('No new blocks to read; no scan performed.');
        this.scanInProgress = false;
        return;
      }
      this.logger.log(`Starting scan from block #${currentBlockNumber} (${latestBlockHash})`);

      while (!this.paused && !latestBlockHash.isEmpty && queueSize < this.configService.getQueueHighWater()) {
        // eslint-disable-next-line no-await-in-loop
        const at = await this.blockchainService.apiPromise.at(latestBlockHash.toHex());
        // eslint-disable-next-line no-await-in-loop
        const events = await at.query.system.events();
        // eslint-disable-next-line no-await-in-loop
        const messages = await this.processEvents(events, eventsToWatch);
        if (messages.length > 0) {
          this.logger.debug(`Found ${messages.length} messages to process`);
        }
        // eslint-disable-next-line no-await-in-loop
        await this.queueIPFSJobs(messages);
        // eslint-disable-next-line no-await-in-loop
        await this.saveProgress(lastScannedBlock);
        lastScannedBlock += 1n;
        // eslint-disable-next-line no-await-in-loop
        latestBlockHash = await this.blockchainService.getBlockHash(lastScannedBlock);
        // eslint-disable-next-line no-await-in-loop
        queueSize = await this.ipfsQueue.count();
      }
      if (latestBlockHash.isEmpty) {
        this.logger.log(`Scan reached end-of-chain at block ${lastScannedBlock - 1n}`);
      } else if (queueSize > this.configService.getQueueHighWater()) {
        this.logger.log('Queue soft limit reached; pausing scan until next iteration');
      }
    } catch (err) {
      this.logger.error(err);
    } finally {
      this.scanInProgress = false;
    }
  }

  private async processEvents(events: Vec<FrameSystemEventRecord>, eventsToWatch: ChainWatchOptionsDto): Promise<MessageResponse[]> {
    const filteredEvents: (Vec<MessageResponse> | null)[] = await Promise.all(
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
          this.logger.error(JSON.stringify(messageResponse));
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
          return messages;
        }
        return null;
      }),
    );

    const collectedMessages: MessageResponse[] = [];
    filteredEvents.forEach((event) => {
      if (event) {
        collectedMessages.push(...event.toArray());
      }
    });
    return collectedMessages;
  }

  private async queueIPFSJobs(messages: MessageResponse[]) {
    const promises = messages.map(async (messageResponse) => {
      if (!messageResponse.cid || messageResponse.cid.isNone) {
        return;
      }

      const ipfsQueueJob = createIPFSQueueJob(
        messageResponse.msa_id.isNone ? messageResponse.provider_msa_id.toString() : messageResponse.msa_id.unwrap().toString(),
        messageResponse.provider_msa_id.toString(),
        messageResponse.cid.unwrap().toString(),
        messageResponse.index.toNumber(),
        '',
      );
      // eslint-disable-next-line no-await-in-loop
      await this.ipfsQueue.add(`IPFS Job: ${ipfsQueueJob.key}`, ipfsQueueJob.data, { jobId: ipfsQueueJob.key });
    });

    await Promise.all(promises);
  }

  private async getLastSeenBlockNumber(): Promise<bigint> {
    return BigInt(((await this.cache.get(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY)) ?? 0).toString());
  }

  private async saveProgress(blockNumber: bigint): Promise<void> {
    await this.setLastSeenBlockNumber(blockNumber);
  }

  private async setLastSeenBlockNumber(b: bigint): Promise<void> {
    await this.cache.set(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, b.toString());
  }
}
