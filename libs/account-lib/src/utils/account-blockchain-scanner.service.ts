import '@frequency-chain/api-augment';
import { BlockHash, SignedBlock } from '@polkadot/types/interfaces';
import { BlockchainService } from '#blockchain/blockchain.service';
import Redis from 'ioredis';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { PinoLogger } from 'nestjs-pino';

export const LAST_SEEN_BLOCK_NUMBER_KEY = 'lastSeenBlockNumber';

export interface IBlockchainScanParameters {
  onlyFinalized?: boolean;
}

export class EndOfChainError extends Error {}

export class SkipBlockError extends Error {}

function eventName({ event: { section, method } }: FrameSystemEventRecord) {
  return `${section}.${method}`;
}

export abstract class AccountBlockchainScannerService {
  private scanIsPaused = false;

  protected scanInProgress = false;

  protected chainEventHandlers = new Map<
    string,
    ((block: SignedBlock, event: FrameSystemEventRecord) => unknown | Promise<unknown>)[]
  >();

  private readonly lastSeenBlockNumberKey: string;

  private p_scanParameters: IBlockchainScanParameters = {};

  constructor(
    protected cacheManager: Redis,
    protected readonly blockchainService: BlockchainService, // <<--- NOTE! Not BlockchainScannerService!
    protected readonly logger: PinoLogger,
  ) {
    logger.setContext(this.constructor.name);
    this.lastSeenBlockNumberKey = `${this.constructor.name}:${LAST_SEEN_BLOCK_NUMBER_KEY}`;

    // These listeners are still present when the chain.disconnected event is received.
    // However, it is polkadot-api.service isn't emitting a chain.connected event when the node starts back up.
    blockchainService.on('chain.connected', () => {
      this.logger.info('Chain connected.  Unpausing blockchain-scanner service.');
      this.paused = false;
    });
    blockchainService.on('chain.disconnected', () => {
      this.logger.info('Chain disconnected.  Pausing blockchain-scanner service.');
      this.paused = true;
    });
  }

  protected get paused() {
    return this.scanIsPaused;
  }

  private set paused(p: boolean) {
    this.scanIsPaused = p;
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
      this.logger.trace('Scheduled blockchain scan skipped due to previous scan still in progress');
      return;
    }
    try {
      // Only scan blocks if initial conditions met
      await this.checkInitialScanParameters();

      // assume we are starting the scan.
      this.scanInProgress = true;
      let currentBlockNumber: number;
      let currentBlockHash: BlockHash;

      // on a disconnect this gets skipped, a scan in progress will be set to false
      // in the next block of code, and we exit early.
      if (!this.paused) {
        const lastSeenBlockNumber = await this.getLastSeenBlockNumber();
        currentBlockNumber = lastSeenBlockNumber + 1;
        currentBlockHash = await this.blockchainService.getBlockHash(currentBlockNumber);
      }
      if (!currentBlockHash.some((byte) => byte !== 0)) {
        this.scanInProgress = false;
        return;
      }
      this.logger.trace(`Starting scan from block #${currentBlockNumber}`);

      while (!this.paused) {
        try {
          await this.checkScanParameters(currentBlockNumber, currentBlockHash); // throws when end-of-chain reached
          const block = await this.blockchainService.getBlock(currentBlockHash);
          const blockEvents = await this.blockchainService.getEvents(currentBlockHash);
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
      if (!(e instanceof EndOfChainError) && !this.paused) {
        this.logger.error(JSON.stringify(e));
        throw e;
      }
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

  protected checkInitialScanParameters(): Promise<void> {
    return Promise.resolve();
  }

  protected async checkScanParameters(blockNumber: number, blockHash: BlockHash): Promise<void> {
    if (blockHash.isEmpty) {
      throw new EndOfChainError(`Empty block hash encountered; end of chain at block ${blockNumber}`);
    }

    if (this.scanParameters?.onlyFinalized) {
      const lastFinalizedBlockNumber = await this.blockchainService.getLatestBlockNumber();
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
