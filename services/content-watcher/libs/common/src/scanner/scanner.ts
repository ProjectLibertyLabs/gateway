/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
import '@frequency-chain/api-augment';
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
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
import { IScanReset } from '../interfaces/scan-reset.interface';

const INTERVAL_SCAN_NAME = 'intervalScan';

@Injectable()
export class ScannerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger: Logger;

  private scanInProgress = false;
  private paused = false;
  private scanResetBlockNumber: number | undefined;

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
    const startingBlock = this.configService.startingBlock;
    if (startingBlock) {
      this.logger.log(`Setting initial scan block to ${startingBlock}`);
      this.setLastSeenBlockNumber(startingBlock - 1);
    }
    setImmediate(() => this.scan());

    const scanInterval = this.configService.blockchainScanIntervalMinutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
    this.schedulerRegistry.addInterval(INTERVAL_SCAN_NAME, setInterval(() => this.scan(), scanInterval));
  }

  onApplicationShutdown(_signal?: string | undefined) {
    const interval = this.schedulerRegistry.getInterval(INTERVAL_SCAN_NAME);
    clearInterval(interval);
  }

  public pauseScanner() {
    this.logger.debug('Pausing scanner');
    this.paused = true;
  }

  public resumeScanner(immediate = false) {
    this.logger.debug('Resuming scanner');
    this.paused = false;
    if (immediate) {
      setImmediate(() => this.scan());
    }
  }

  public async resetScan({ blockNumber, rewindOffset, immediate }: IScanReset) {
    this.pauseScanner();
    let targetBlock = blockNumber ?? await this.blockchainService.getLatestFinalizedBlockNumber();
    targetBlock -= rewindOffset ? Math.abs(rewindOffset) : 0;
    targetBlock = Math.max(targetBlock, 1);
    this.scanResetBlockNumber = targetBlock;
    this.logger.log(`Resetting scan to block #${targetBlock}`);
    this.resumeScanner(immediate);
  }

  async scan() {
    try {
      this.logger.debug('Starting scanner');

      if (this.scanInProgress) {
        this.logger.debug('Scan already in progress');
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

      let first = true;
      while (true) {
        if (this.paused) {
          this.logger.log('Scan paused');
          break;
        }

        const queueSize = await this.ipfsQueue.count();
        if (queueSize > this.configService.queueHighWater) {
          this.logger.log('Queue soft limit reached; pausing scan until next interval');
          break;
        }

        const currentBlockNumber = await this.getNextBlockNumber();
        const currentBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);
        if (currentBlockHash.isEmpty) {
          this.logger.log(`No new blocks to scan @ block number ${currentBlockNumber}; pausing scan until next interval`);
          break;
        }

        if (first) {
          this.logger.log(`Starting scan @ block # ${currentBlockNumber} (${currentBlockHash})`);
          first = false;
        }

        const messages = await this.chainEventProcessor.getMessagesInBlock(currentBlockNumber, eventsToWatch);
        if (messages.length > 0) {
          this.logger.debug(`Found ${messages.length} messages to process`);
        }
        await this.chainEventProcessor.queueIPFSJobs(messages, this.ipfsQueue);
        await this.saveProgress(currentBlockNumber);
      }
    } catch (err) {
      this.logger.error(err);
    } finally {
      this.scanInProgress = false;
    }
  }

  private async getNextBlockNumber(): Promise<number> {
    let nextBlock: number;
    if (this.scanResetBlockNumber) {
      await this.setLastSeenBlockNumber(this.scanResetBlockNumber - 1);
      nextBlock = this.scanResetBlockNumber;
      this.scanResetBlockNumber = undefined;
    } else {
      nextBlock = (Number(await this.cache.get(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY)) ?? 0) + 1;
    }

    return nextBlock;
  }

  private async saveProgress(blockNumber: number): Promise<void> {
    await this.setLastSeenBlockNumber(blockNumber);
  }

  private async setLastSeenBlockNumber(b: number): Promise<void> {
    await this.cache.setex(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, RedisUtils.STORAGE_EXPIRE_UPPER_LIMIT_SECONDS, b);
  }
}
