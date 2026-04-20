import { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import Redis from 'ioredis';
import { SignedBlock } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { HexString } from '@polkadot/util/types';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { RegistryError } from '@polkadot/types/types';
import { SECONDS_PER_BLOCK } from '#types/constants/blockchain-constants';
import { TXN_WATCH_LIST_KEY } from '#types/constants';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import { BlockchainScannerService } from '#blockchain/blockchain-scanner.service';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { PinoLogger } from 'nestjs-pino';
import { IBaseTxStatus } from "#types/interfaces";

export type IWatchedTransactionStatus = Omit<IBaseTxStatus, 'type'|'referenceId'|'providerId'>;

export interface IWatchedTransactionScannerConfig {
  blockchainScanIntervalSeconds: number;
  trustUnfinalizedBlocks: boolean;
}

export interface IWatchedTransactionContext<TTxStatus extends IWatchedTransactionStatus> {
  txHash: HexString;
  txIndex: number;
  txStatus: TTxStatus;
  currentBlock: SignedBlock;
  blockEvents: FrameSystemEventRecord[];
  extrinsicEvents: FrameSystemEventRecord[];
  currentBlockNumber: number;
}

export interface IWatchedTransactionSuccessContext<TTxStatus extends IWatchedTransactionStatus>
  extends IWatchedTransactionContext<TTxStatus> {
  successEvent: FrameSystemEventRecord['event'];
}

export interface IWatchedTransactionFailureContext<TTxStatus extends IWatchedTransactionStatus>
  extends IWatchedTransactionContext<TTxStatus> {
  failureEvent: FrameSystemEventRecord['event'];
  moduleError: RegistryError;
}

export abstract class WatchedTransactionScannerService<TTxStatus extends IWatchedTransactionStatus>
  extends BlockchainScannerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(
    blockchainService: BlockchainRpcQueryService,
    protected readonly schedulerRegistry: SchedulerRegistry,
    cacheManager: Redis,
    protected readonly config: IWatchedTransactionScannerConfig,
    capacityService: CapacityCheckerService,
    protected readonly logger: PinoLogger,
  ) {
    super(cacheManager, blockchainService, logger);
    this.scanParameters = { onlyFinalized: this.config.trustUnfinalizedBlocks };
    this.registerChainEventHandler(['capacity.UnStaked', 'capacity.Staked'], () =>
      capacityService.checkForSufficientCapacity(),
    );
  }

  public get intervalName() {
    return `${this.constructor.name}:blockchainScan`;
  }

  public async onApplicationBootstrap() {
    await this.blockchainService.isReady();
    const pendingTxns = await this.cacheManager.hkeys(TXN_WATCH_LIST_KEY);
    if (pendingTxns.length === 0) {
      const blockNumber = await this.blockchainService.getLatestBlockNumber();
      await this.setLastSeenBlockNumber(blockNumber);
    }
    this.schedulerRegistry.addInterval(
      this.intervalName,
      setInterval(() => this.scan(), this.config.blockchainScanIntervalSeconds * MILLISECONDS_PER_SECOND),
    );
  }

  public async onApplicationShutdown(_signal?: string) {
    if (this.schedulerRegistry.doesExist('interval', this.intervalName)) {
      this.schedulerRegistry.deleteInterval(this.intervalName);
    }
  }

  public async getLastSeenBlockNumber(): Promise<number> {
    let blockNumber = await super.getLastSeenBlockNumber();
    const pendingTxns = await this.loadPendingTransactions();
    if (pendingTxns.length > 0) {
      const startingBlock = Math.min(...pendingTxns.map((txStatus) => txStatus.birth));
      blockNumber = Math.max(blockNumber, startingBlock);
    }

    return blockNumber;
  }

  public async processCurrentBlock(currentBlock: SignedBlock, blockEvents: FrameSystemEventRecord[]): Promise<void> {
    const currentBlockNumber = currentBlock.block.header.number.toNumber();
    const pendingTxns = await this.loadPendingTransactions();
    const pendingTxnsByHash = new Map(pendingTxns.map((txStatus) => [txStatus.txHash, txStatus] as const));
    const handledTxHashes = new Set<string>();

    const extrinsicIndices: [HexString, number][] = [];
    currentBlock.block.extrinsics.forEach((extrinsic, index) => {
      if (pendingTxnsByHash.has(extrinsic.hash.toHex())) {
        extrinsicIndices.push([extrinsic.hash.toHex(), index]);
      }
    });

    let pipeline = this.cacheManager.multi({ pipeline: true });

    // TODO: this block needs a test
    if (extrinsicIndices.length > 0) {
      const epoch = await this.blockchainService.getCurrentCapacityEpoch(currentBlock.block.hash);
      const events = blockEvents.filter(
        ({ phase }) =>
          phase.isApplyExtrinsic && extrinsicIndices.some(([, txIndex]) => phase.asApplyExtrinsic.eq(txIndex)),
      );

      const totalCapacityWithdrawn = events.reduce((sum, { event }) => {
        if (this.blockchainService.events.capacity.CapacityWithdrawn.is(event)) {
          return sum + event.data.amount.toBigInt();
        }
        return sum;
      }, 0n);

      // eslint-disable-next-line no-restricted-syntax
      for (const [txHash, txIndex] of extrinsicIndices) {
        const txStatus = pendingTxnsByHash.get(txHash);
        if (!txStatus) {
          continue;
        }

        const extrinsicEvents = events.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(txIndex),
        );
        const successEvent = this.findSuccessEvent(txStatus, extrinsicEvents, blockEvents);
        const failureEvent = extrinsicEvents.find(({ event }) =>
          this.blockchainService.events.system.ExtrinsicFailed.is(event),
        )?.event;
        const context = {
          txHash,
          txIndex,
          txStatus,
          currentBlock,
          blockEvents,
          extrinsicEvents,
          currentBlockNumber,
        };

        if (failureEvent && this.blockchainService.events.system.ExtrinsicFailed.is(failureEvent)) {
          const { dispatchError } = failureEvent.data;
          const moduleThatErrored = dispatchError.asModule;
          const moduleError = dispatchError.registry.findMetaError(moduleThatErrored);
          await this.handleTransactionFailure({
            ...context,
            failureEvent,
            moduleError,
          });
        } else if (successEvent) {
          await this.handleTransactionSuccess({
            ...context,
            successEvent,
          });
        } else {
          await this.handleTransactionWithoutTerminalEvent(context);
        }

        handledTxHashes.add(txHash);
        pipeline = pipeline.hdel(TXN_WATCH_LIST_KEY, txHash);
      }

      await this.setEpochCapacity(epoch, totalCapacityWithdrawn);
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const txStatus of pendingTxns) {
      if (!handledTxHashes.has(txStatus.txHash) && txStatus.death <= currentBlockNumber) {
        await this.handleTransactionExpired(txStatus, currentBlockNumber);
        pipeline = pipeline.hdel(TXN_WATCH_LIST_KEY, txStatus.txHash);
      }
    }

    await pipeline.exec();
  }

  protected async loadPendingTransactions(): Promise<TTxStatus[]> {
    return (await this.cacheManager.hvals(TXN_WATCH_LIST_KEY)).map((value) => JSON.parse(value) as TTxStatus);
  }

  protected findSuccessEvent(
    txStatus: TTxStatus,
    extrinsicEvents: FrameSystemEventRecord[],
    _blockEvents: FrameSystemEventRecord[],
  ): FrameSystemEventRecord['event'] | undefined {
    if (!txStatus.successEvent) {
      return undefined;
    }

    return extrinsicEvents.find(
      ({ event }) => event.section === txStatus.successEvent.section && event.method === txStatus.successEvent.method,
    )?.event;
  }

  protected async handleTransactionWithoutTerminalEvent(context: IWatchedTransactionContext<TTxStatus>): Promise<void> {
    const expectedEvent = context.txStatus.successEvent
      ? `${context.txStatus.successEvent.section}.${context.txStatus.successEvent.method}`
      : 'undefined';
    this.logger.error(
      `Watched transaction ${context.txHash} found in block ${context.currentBlockNumber}, but found no corresponding '${expectedEvent}' or 'ExtrinsicFailure' events`,
    );
  }

  private async setEpochCapacity(epoch: string | number, capacityWithdrawn: bigint): Promise<void> {
    const epochCapacityKey = `epochCapacity:${epoch}`;

    try {
      const savedCapacity = await this.cacheManager.get(epochCapacityKey);
      const epochCapacity = BigInt(savedCapacity ?? 0);
      const newEpochCapacity = epochCapacity + capacityWithdrawn;
      const epochDurationBlocks = await this.blockchainService.getCurrentEpochLength();
      const epochDuration = epochDurationBlocks * SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND;
      await this.cacheManager.setex(epochCapacityKey, epochDuration, newEpochCapacity.toString());
    } catch (error) {
      this.logger.error(`Error setting epoch capacity: ${error}`);
    }
  }

  protected abstract handleTransactionSuccess(context: IWatchedTransactionSuccessContext<TTxStatus>): Promise<void>;

  protected abstract handleTransactionFailure(context: IWatchedTransactionFailureContext<TTxStatus>): Promise<void>;

  protected abstract handleTransactionExpired(txStatus: TTxStatus, currentBlockNumber: number): Promise<void>;
}
