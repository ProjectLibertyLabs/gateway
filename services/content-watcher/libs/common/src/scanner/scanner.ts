/* eslint-disable no-underscore-dangle */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from 'time-constants';
import { u16, u32 } from '@polkadot/types';
import { SchemaId } from '@frequency-chain/api-augment/interfaces';
import { Queue } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { BlockNumber } from '@polkadot/types/interfaces';
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
    const startingBlock = BigInt(this.configService.startingBlock)-1n;
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
        const events = await this.fetchEventsFromBlockchain(latestBlockHash);
        // eslint-disable-next-line no-await-in-loop
        const filteredEvents = await this.processEvents(events, eventsToWatch);
        // eslint-disable-next-line no-await-in-loop
        await this.queueIPFSJobs(filteredEvents);
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

  private async queueIPFSJobs(events) {
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
        '',
      );

      // eslint-disable-next-line no-await-in-loop
      await this.ipfsQueue.add(`IPFS Job: ${ipfsQueueJob.key}`, ipfsQueueJob.data, { jobId: ipfsQueueJob.key });
    });
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(jobs);
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
