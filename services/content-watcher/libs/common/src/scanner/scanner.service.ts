/* eslint-disable no-underscore-dangle */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { ConfigService } from '../config/config.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { QueueConstants } from '../utils/queues';

@Injectable()
export class ScannerService {
  private readonly logger;

  constructor(
    @InjectQueue(QueueConstants.IPFS_QUEUE) private readonly ipfsQueue,
    @InjectRedis() private readonly cache: Redis,
    private readonly configService: ConfigService,
    private readonly blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(ScannerService.name);
  }

  async start() {
    this.logger.debug('Starting scanner');
    const lastScannedBlockNumber = BigInt(await this.cache.get('lastScannedBlock') || 0n);
    const currentFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
  }
}
