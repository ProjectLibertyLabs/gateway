/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
import '@frequency-chain/api-augment';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from 'time-constants';
import { Queue } from 'bullmq';
import { ConfigService } from '../config/config.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import * as QueueConstants from '../utils/queues';
import { EVENTS_TO_WATCH_KEY, LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, REGISTERED_WEBHOOK_KEY } from '../constants';
import { ChainWatchOptionsDto } from '../dtos/chain.watch.dto';
import * as RedisUtils from '../utils/redis';
import { ChainEventProcessorService } from '../blockchain/chain-event-processor.service';

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
    private chainEventProcessor: ChainEventProcessorService,
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
      let currentBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);

      if (currentBlockHash.isEmpty) {
        this.logger.log('No new blocks to read; no scan performed.');
        this.scanInProgress = false;
        return;
      }
      this.logger.log(`Starting scan from block #${currentBlockNumber} (${currentBlockHash})`);

      while (!this.paused && !currentBlockHash.isEmpty && queueSize < this.configService.queueHighWater) {
        const messages = await this.chainEventProcessor.getMessagesInBlock(lastScannedBlock, eventsToWatch);
        if (messages.length > 0) {
          this.logger.debug(`Found ${messages.length} messages to process`);
        }
        await this.chainEventProcessor.queueIPFSJobs(messages, this.ipfsQueue);
        await this.saveProgress(lastScannedBlock);
        lastScannedBlock += 1;
        currentBlockHash = await this.blockchainService.getBlockHash(lastScannedBlock);
        queueSize = await this.ipfsQueue.count();
      }
      if (currentBlockHash.isEmpty) {
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
