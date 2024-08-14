/* eslint-disable no-await-in-loop */
/* eslint-disable max-classes-per-file */
import '@frequency-chain/api-augment';
import { Logger } from '@nestjs/common';
import { BlockHash, SignedBlock } from '@polkadot/types/interfaces';
import { BlockchainService } from '#libs/blockchain/blockchain.service';
import Redis from 'ioredis';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';

export const LAST_SEEN_BLOCK_NUMBER_KEY = 'lastSeenBlockNumber';

export interface IBlockchainScanParameters {
  onlyFinalized?: boolean;
}

export class EndOfChainError extends Error {}
export class NullScanError extends Error {}
export class SkipBlockError extends Error {}

function eventName({ event: { section, method } }: FrameSystemEventRecord) {
  return `${section}.${method}`;
}

export abstract class BlockchainScannerService {
  protected scanInProgress = false;

  protected chainEventHandlers = new Map<
    string,
    ((block: SignedBlock, event: FrameSystemEventRecord) => unknown | Promise<unknown>)[]
  >();

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

    try {
      // Only scan blocks if initial conditions met
      await this.checkInitialScanParameters();

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

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          await this.checkScanParameters(currentBlockNumber, currentBlockHash); // throws when end-of-chain reached
          const block = await this.blockchainService.getBlock(currentBlockHash);
          const at = await this.blockchainService.api.at(currentBlockHash);
          const blockEvents = (await at.query.system.events()).toArray();
          await this.handleChainEvents(block, blockEvents);
          await this.processCurrentBlock(block, blockEvents);
        } catch (err) {
          if (!(err instanceof SkipBlockError)) {
            throw err;
          }
          this.logger.debug(`Skipping block ${currentBlockNumber}`);
        }
        await this.setLastSeenBlockNumber(currentBlockNumber);

        // Move to the next block
        currentBlockNumber += 1;
        currentBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);
      }
    } catch (e) {
      if (e instanceof EndOfChainError) {
        this.logger.error(e.message);
        return;
      }

      if (e instanceof NullScanError) {
        this.logger.verbose(e.message);
        return;
      }

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
  protected checkInitialScanParameters(): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line class-methods-use-this
  protected async checkScanParameters(blockNumber: number, blockHash: BlockHash): Promise<void> {
    if (blockHash.isEmpty) {
      throw new EndOfChainError(`Empty block hash encountered; end of chain at block ${blockNumber}`);
    }

    if (this.scanParameters?.onlyFinalized) {
      const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      if (blockNumber > lastFinalizedBlockNumber) {
        throw new EndOfChainError(`Latest finalized block (${lastFinalizedBlockNumber}) encountered`);
      }
    }
  }

  public registerChainEventHandler(
    events: string[],
    callback: (block: SignedBlock, blockEvents: FrameSystemEventRecord) => unknown | Promise<unknown>,
  ) {
    events.forEach((event) => {
      const handlers = new Set(this.chainEventHandlers.get(event) || []);
      handlers.add(callback);
      this.chainEventHandlers.set(event, [...handlers]);
    });
  }

  private async handleChainEvents(block: SignedBlock, blockEvents: FrameSystemEventRecord[]) {
    const promises = blockEvents
      .filter((blockEvent) => this.chainEventHandlers.has(eventName(blockEvent)))
      .flatMap((blockEvent) =>
        this.chainEventHandlers.get(eventName(blockEvent))?.map((handler) => handler(block, blockEvent)),
      );
    try {
      await Promise.all(promises);
    } catch (err) {
      this.logger.error(`Error processing registered chain event handler: ${err}`);
    }
  }

  protected abstract processCurrentBlock(
    currentBlock: SignedBlock,
    blockEvents: FrameSystemEventRecord[],
  ): Promise<void>;
}
