/* eslint-disable no-underscore-dangle */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from 'time-constants';
import { u16, u32 } from '@polkadot/types';
import { BlockPaginationRequest, MessageResponse, SchemaId } from '@frequency-chain/api-augment/interfaces';
import { Queue } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { BlockNumber } from '@polkadot/types/interfaces';
import { IEventLike } from '@polkadot/types/types';
import { ConfigService } from '../config/config.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { QueueConstants } from '../utils/queues';
import { EVENTS_TO_WATCH_KEY, LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY } from '../constants';
import { IChainWatchOptions } from '../interfaces/chain.filter.interface';
import { IIPFSJob, createIPFSQueueJob } from '../interfaces/ipfs.job.interface';

@Injectable()
export class ScannerService implements OnApplicationBootstrap {
  private readonly logger: Logger;

  private scanInProgress = false;

  constructor(
    @InjectRedis() private readonly cache: Redis,
    @InjectQueue(QueueConstants.IPFS_QUEUE) private readonly ipfsQueue: Queue,
    private readonly configService: ConfigService,
    private readonly blockchainService: BlockchainService,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.logger = new Logger(ScannerService.name);
  }

  async onApplicationBootstrap() {
    const interval = setInterval(() => this.scan(), this.configService.getBlockchainScanIntervalMinutes() * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND);
    this.schedulerRegistry.addInterval('blockchainScan', interval);
    const initialTimeout = setTimeout(() => this.scan(), 0);
    this.schedulerRegistry.addTimeout('initialScan', initialTimeout);
  }

  async scan() {
    this.logger.debug('Starting scanner');
    try {
      if (this.scanInProgress) {
        this.logger.debug('Scan already in progress');
        return;
      }
      // Only scan blocks if queue is empty
      let queueSize = await this.ipfsQueue.count();
      if (queueSize > 0) {
        this.logger.log('Deferring next blockchain scan until queue is empty');
        return;
      }

      const chainWatchFilters = await this.cache.get(EVENTS_TO_WATCH_KEY);
      const eventsToWatch: IChainWatchOptions = JSON.parse(chainWatchFilters ?? '');

      this.scanInProgress = true;
      let lastScannedBlock = await this.getLastSeenBlockNumber();

      let latestBlockHash = await this.blockchainService.getBlockHash(lastScannedBlock);

      if (!latestBlockHash.some((byte) => byte !== 0)) {
        this.logger.log('No new blocks to read; no scan performed.');
        this.scanInProgress = false;
      }

      while (!latestBlockHash.isEmpty && queueSize < this.configService.getQueueHighWater()) {
        // eslint-disable-next-line no-await-in-loop
        const events = (await this.blockchainService.queryAt(latestBlockHash, 'system', 'events')).toArray();
        const eventsPromises: Promise<any>[] = [];
        eventsPromises.push(
          events.forEach(async (event: IEventLike) => {
            if (eventsToWatch.msa_ids.length > 0) {
              if (this.blockchainService.api.events.messages.MessagesStored.is(event) || this.blockchainService.api.events.messages.MessagesUpdated.is(event)) {
                const schemaId = event.data[0] as SchemaId;
                const blockNumber = event.data[1] as BlockNumber;
                const paginationRequest = {
                  from_block: blockNumber.toBigInt(),
                  from_index: 0,
                  page_size: 1000,
                  to_block: blockNumber.toBigInt() + 1n,
                };
                const messageResponse = await firstValueFrom(this.blockchainService.api.rpc.messages.getBySchemaId(schemaId, paginationRequest));
                const senderMsaId = messageResponse.msa_id.unwrap().toString();
                const providerMsaId = messageResponse.provider_msa_id.unwrap().toString();
                if (eventsToWatch.msa_ids.includes(senderMsaId) || eventsToWatch.msa_ids.includes(providerMsaId)) {
                  return true;
                }
              }
            } else {
              return true;
            }
            return false;
          }),
        );
        // eslint-disable-next-line no-await-in-loop
        const filtereredPromises = await Promise.all(eventsPromises);

        if (filtereredPromises.length > 0) {
          this.logger.log(`Found ${filtereredPromises.length} messages to process`);
        }

        const jobs = filtereredPromises.map(async ({ event }) => {
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
          );
          // eslint-disable-next-line no-await-in-loop
          await this.ipfsQueue.add(`IPFS Job: ${ipfsQueueJob.key}`, ipfsQueueJob.data, { jobId: ipfsQueueJob.key });
        });

        // eslint-disable-next-line no-await-in-loop
        await Promise.all(jobs);

        // eslint-disable-next-line no-await-in-loop
        await this.saveProgress(lastScannedBlock);

        lastScannedBlock += 1n;

        // eslint-disable-next-line no-await-in-loop
        latestBlockHash = await this.blockchainService.getBlockHash(lastScannedBlock);
        // eslint-disable-next-line no-await-in-loop
        queueSize = await this.ipfsQueue.count();
      }
    } catch (err) {
      this.logger.error(err);
    }
  }

  async crawlBlockListWithFilters(blockList: bigint[], filters: IChainWatchOptions): Promise<void> {
    this.logger.log(`Crawling block list with filters: ${JSON.stringify(filters)}`);
    // wait for current scan to finish
    // eslint-disable-next-line no-await-in-loop
    while ((await this.ipfsQueue.count()) > 0 && this.scanInProgress) {
      this.logger.log('Scan already in progress: waiting for IPFS Job queue to empty');
    }

    this.scanInProgress = true;
    try {
      const jobs = blockList.map(async (blockNumber) => {
        const paginationRequest = {
          from_block: blockNumber,
          from_index: 0,
          page_size: 1000,
          to_block: blockNumber + 1n,
        };
        // eslint-disable-next-line no-await-in-loop
        const messageResponse = await firstValueFrom(this.blockchainService.api.rpc.messages.getBySchemaId(filters.schemaIds[0], paginationRequest));

        if (messageResponse.cid.isNone) {
          return;
        }

        const ipfsQueueJob = createIPFSQueueJob(
          messageResponse.msa_id.unwrap().toString(),
          messageResponse.provider_msa_id.unwrap().toString(),
          blockNumber,
          messageResponse.cid.unwrap().toString(),
          messageResponse.index.toNumber(),
        );
        // eslint-disable-next-line no-await-in-loop
        await this.ipfsQueue.add(`IPFS Job: ${ipfsQueueJob.key}`, ipfsQueueJob.data, { jobId: ipfsQueueJob.key });
      });

      // eslint-disable-next-line no-await-in-loop
      await Promise.all(jobs);
      this.scanInProgress = false;
    } catch (err) {
      this.logger.error(err);
    }
  }

  public async getLastSeenBlockNumber(): Promise<bigint> {
    return BigInt(((await this.cache.get(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY)) ?? 0).toString());
  }

  private async saveProgress(blockNumber: bigint): Promise<void> {
    await this.setLastSeenBlockNumber(blockNumber);
  }

  private async setLastSeenBlockNumber(b: bigint): Promise<void> {
    await this.cache.set(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, b.toString());
  }
}
