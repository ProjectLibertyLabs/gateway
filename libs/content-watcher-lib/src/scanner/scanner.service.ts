/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
import '@frequency-chain/api-augment';
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { Queue } from 'bullmq';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { ContentWatcherQueues as QueueConstants } from '#types/constants/queue.constants';
import {
  EVENTS_TO_WATCH_KEY,
  LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY,
  REGISTERED_WEBHOOK_KEY,
  STORAGE_EXPIRE_UPPER_LIMIT_SECONDS,
} from '#types/constants';
import { ChainWatchOptionsDto } from '#types/dtos/content-watcher/chain.watch.dto';
import { ChainEventProcessorService } from '../utils/chain-event-processor.service';
import { IScanReset } from '#types/interfaces/content-watcher/scan-reset.interface';
import scannerConfig, { IScannerConfig } from './scanner.config';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';
import { PinoLogger } from 'nestjs-pino';

const INTERVAL_SCAN_NAME = 'intervalScan';

@Injectable()
export class ScannerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private scanInProgress = false;

  private paused = false;

  private scanResetBlockNumber: number | undefined;

  private isHighWater = false;

  constructor(
    @Inject(scannerConfig.KEY) private readonly config: IScannerConfig,
    private readonly blockchainService: BlockchainRpcQueryService,
    @InjectRedis() private readonly cache: Redis,
    @InjectQueue(QueueConstants.WATCHER_IPFS_QUEUE) private readonly ipfsQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
    private chainEventProcessor: ChainEventProcessorService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async onApplicationBootstrap() {
    setImmediate(() => this.scan());

    const scanInterval = this.config.blockchainScanIntervalSeconds * MILLISECONDS_PER_SECOND;
    this.schedulerRegistry.addInterval(
      INTERVAL_SCAN_NAME,
      setInterval(() => this.scan(), scanInterval),
    );
  }

  onApplicationShutdown(_signal?: string | undefined) {
    if (this.schedulerRegistry.doesExist('interval', INTERVAL_SCAN_NAME)) {
      clearInterval(this.schedulerRegistry.getInterval(INTERVAL_SCAN_NAME));
    }
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
    let targetBlock = blockNumber ?? (await this.blockchainService.getLatestBlockNumber());
    targetBlock -= rewindOffset ? Math.abs(rewindOffset) : 0;
    targetBlock = Math.max(targetBlock, 1);
    this.scanResetBlockNumber = targetBlock;
    this.logger.info(`Resetting scan to block #${targetBlock}`);
    this.resumeScanner(immediate);
  }

  async scan() {
    try {
      if (this.scanInProgress) {
        return;
      }

      const registeredWebhook = await this.cache.get(REGISTERED_WEBHOOK_KEY);
      if (!registeredWebhook) {
        return;
      }
      const chainWatchFilters = await this.cache.get(EVENTS_TO_WATCH_KEY);
      const eventsToWatch: ChainWatchOptionsDto = chainWatchFilters
        ? JSON.parse(chainWatchFilters)
        : { msa_ids: [], schemaIds: [] };

      this.scanInProgress = true;

      let first = true;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (this.paused) {
          this.logger.info('Scan paused');
          break;
        }

        const queueSize = await this.ipfsQueue.count();
        if (queueSize > this.config.queueHighWater) {
          // Check if we're entering high water mark
          if (!this.isHighWater) {
            this.logger.info(
              `Queue soft limit reached (${queueSize}/${this.config.queueHighWater}); pausing scan until next interval`,
            );
            this.isHighWater = true;
          }
          // Check if we've drained enough to exit high water state
          else if (this.isHighWater && queueSize <= this.config.queueHighWater * 0.8) {
            this.logger.info(
              `Queue drained below threshold (${queueSize}/${this.config.queueHighWater}); will resume scanning`,
            );
            this.isHighWater = false;
          }
          break;
        }

        const currentBlockNumber = await this.getNextBlockNumber();
        const currentBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);
        if (currentBlockHash.isEmpty) {
          break;
        }

        if (first) {
          first = false;
        }

        const messages = await this.chainEventProcessor.getMessagesInBlock(currentBlockNumber, eventsToWatch);
        if (messages.length > 0) {
          this.logger.trace(`Found ${messages.length} messages to process`);
        }
        await ChainEventProcessorService.queueIPFSJobs(messages, this.ipfsQueue);
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
      nextBlock = Number((await this.cache.get(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY)) ?? '0');
      if (!nextBlock) {
        nextBlock = await this.blockchainService.getLatestBlockNumber();
        this.setLastSeenBlockNumber(nextBlock);
      }

      nextBlock += 1;
    }

    return nextBlock;
  }

  private async saveProgress(blockNumber: number): Promise<void> {
    await this.setLastSeenBlockNumber(blockNumber);
  }

  private async setLastSeenBlockNumber(b: number): Promise<void> {
    await this.cache.setex(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, STORAGE_EXPIRE_UPPER_LIMIT_SECONDS, b);
  }
}
