import '@frequency-chain/api-augment';
import { Logger } from '@nestjs/common';
import { BlockHash } from '@polkadot/types/interfaces';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import Redis from 'ioredis';
import { ok } from 'assert';

export const LAST_SEEN_BLOCK_NUMBER_KEY = 'lastSeenBlockNumber';

export interface IBlockchainScanParameters {
  onlyFinalized?: boolean;
}

export abstract class BlockchainScannerService {
  protected scanInProgress = false;

  private readonly lastSeenBlockNumberKey: string;

  private p_scanParameters: IBlockchainScanParameters = {};

  constructor(
    protected cacheManager: Redis,
    protected readonly blockchainService: BlockchainService,
    protected readonly logger: Logger,
  ) {
    this.lastSeenBlockNumberKey = `${this.constructor.name}:${LAST_SEEN_BLOCK_NUMBER_KEY}`;
  }

  public get scanParameters() {
    return this.p_scanParameters;
  }

  public set scanParameters(params: IBlockchainScanParameters) {
    this.p_scanParameters = {
      ...this.p_scanParameters,
      ...params,
    };
  }

  public async scan(): Promise<void> {
    if (this.scanInProgress) {
      this.logger.verbose('Scheduled blockchain scan skipped due to previous scan still in progress');
      return;
    }

    // Only scan blocks if initial conditions met
    if (!(await this.checkInitialScanParameters())) {
      this.logger.verbose('Skipping blockchain scan--initial conditions not met');
      return;
    }

    try {
      this.scanInProgress = true;
      let currentBlockNumber: number;
      let currentBlockHash: BlockHash;

      const lastSeenBlockNumber = await this.getLastSeenBlockNumber();
      currentBlockNumber = lastSeenBlockNumber + 1;
      currentBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);

      if (!currentBlockHash.some((byte) => byte !== 0)) {
        this.scanInProgress = false;
        return;
      }
      this.logger.verbose(`Starting scan from block #${currentBlockNumber}`);

      // eslint-disable-next-line no-await-in-loop
      while (!currentBlockHash.isEmpty && !!(await this.checkScanParameters(currentBlockNumber, currentBlockHash))) {
        // eslint-disable-next-line no-await-in-loop
        await this.processCurrentBlock(currentBlockHash, currentBlockNumber);
        // eslint-disable-next-line no-await-in-loop
        await this.setLastSeenBlockNumber(currentBlockNumber);

        // Move to the next block
        currentBlockNumber += 1;
        // eslint-disable-next-line no-await-in-loop
        currentBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);
      }

      if (currentBlockHash.isEmpty) {
        this.logger.verbose(`Scan reached end-of-chain at block ${currentBlockNumber - 1}`);
      }
    } catch (e) {
      this.logger.error(JSON.stringify(e));
      throw e;
    } finally {
      this.scanInProgress = false;
    }
  }

  public async getLastSeenBlockNumber(): Promise<number> {
    return Number((await this.cacheManager.get(this.lastSeenBlockNumberKey)) ?? 0);
  }

  protected async setLastSeenBlockNumber(b: number): Promise<void> {
    await this.cacheManager.set(this.lastSeenBlockNumberKey, b);
  }

  // eslint-disable-next-line class-methods-use-this
  protected checkInitialScanParameters(): Promise<boolean> {
    return Promise.resolve(true);
  }

  // eslint-disable-next-line class-methods-use-this
  protected async checkScanParameters(blockNumber: number, _blockHash: BlockHash): Promise<boolean> {
    let okToScan = true;
    if (this.scanParameters?.onlyFinalized) {
      const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      okToScan = blockNumber <= lastFinalizedBlockNumber;
    }

    return okToScan;
  }

  protected abstract processCurrentBlock(currentBlockHash: BlockHash, currentBlockNumber: number): Promise<void>;
}
