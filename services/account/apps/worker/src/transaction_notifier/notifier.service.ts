/* eslint-disable no-await-in-loop */
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import axios from 'axios';
import { BlockchainConstants } from '#lib/blockchain/blockchain-constants';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { TransactionType } from '#lib/types/enums';
import { QueueConstants } from '#lib/utils/queues';
import { SECONDS_PER_BLOCK, TxWebhookRsp, RedisUtils } from 'libs/common/src';
import { createWebhookRsp } from '#worker/transaction_notifier/notifier.service.helper.createWebhookRsp';
import { BlockchainScannerService, NullScanError } from '#lib/utils/blockchain-scanner.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BlockHash } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { ITxStatus } from '#lib/interfaces/tx-status.interface';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { ConfigService } from '#lib/config/config.service';

@Injectable()
export class TxnNotifierService
  extends BlockchainScannerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  async onApplicationBootstrap() {
    await this.blockchainService.isReady();
    const pendingTxns = await this.cacheManager.hkeys(RedisUtils.TXN_WATCH_LIST_KEY);
    // If no transactions pending, skip to end of chain at startup
    if (pendingTxns.length === 0) {
      const blockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      await this.setLastSeenBlockNumber(blockNumber);
    }
    this.schedulerRegistry.addInterval(
      this.intervalName,
      setInterval(() => this.scan(), this.configService.blockchainScanIntervalSeconds * MILLISECONDS_PER_SECOND),
    );
  }

  async onApplicationShutdown(_signal?: string | undefined) {
    if (this.schedulerRegistry.doesExist('interval', this.intervalName)) {
      this.schedulerRegistry.deleteInterval(this.intervalName);
    }
  }

  constructor(
    blockchainService: BlockchainService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRedis() cacheManager: Redis,
    private readonly configService: ConfigService,
  ) {
    super(cacheManager, blockchainService, new Logger(TxnNotifierService.prototype.constructor.name));
    this.scanParameters = { onlyFinalized: this.configService.trustUnfinalizedBlocks };
  }

  public get intervalName() {
    return `${this.constructor.name}:blockchainScan`;
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

  protected async checkInitialScanParameters(): Promise<void> {
    const pendingTxns = await this.cacheManager.hlen(RedisUtils.TXN_WATCH_LIST_KEY);
    if (pendingTxns === 0) {
      throw new NullScanError('No pending extrinsics; no scan will be performed');
    }

    return super.checkInitialScanParameters();
  }

  protected async checkScanParameters(blockNumber: number, blockHash: BlockHash): Promise<void> {
    const pendingTxns = await this.cacheManager.hlen(RedisUtils.TXN_WATCH_LIST_KEY);

    if (pendingTxns === 0) {
      throw new NullScanError('No pending extrinsics; terminating current scan iteration');
    }

    return super.checkScanParameters(blockNumber, blockHash);
  }

  public async getLastSeenBlockNumber(): Promise<number> {
    let blockNumber = await super.getLastSeenBlockNumber();
    const pendingTxns = await this.cacheManager.hvals(RedisUtils.TXN_WATCH_LIST_KEY);
    if (pendingTxns.length > 0) {
      const startingBlock = Math.min(
        ...pendingTxns.map((valStr) => {
          const val = JSON.parse(valStr) as ITxStatus;
          return val.birth;
        }),
      );
      blockNumber = Math.max(blockNumber, startingBlock);
    }

    return blockNumber;
  }

  async processCurrentBlock(currentBlockHash: BlockHash, currentBlockNumber: number): Promise<void> {
    // Get set of tx hashes to monitor from cache
    const pendingTxns = (await this.cacheManager.hvals(RedisUtils.TXN_WATCH_LIST_KEY)).map(
      (val) => JSON.parse(val) as ITxStatus,
    );

    const block = await this.blockchainService.getBlock(currentBlockHash);
    const extrinsicIndices: [HexString, number][] = [];
    block.block.extrinsics.forEach((extrinsic, index) => {
      if (pendingTxns.some(({ txHash }) => txHash === extrinsic.hash.toHex())) {
        extrinsicIndices.push([extrinsic.hash.toHex(), index]);
      }
    });

    let pipeline = this.cacheManager.multi({ pipeline: true });

    if (extrinsicIndices.length > 0) {
      const at = await this.blockchainService.api.at(currentBlockHash);
      const epoch = (await at.query.capacity.currentEpoch()).toNumber();
      const events: FrameSystemEventRecord[] = (await at.query.system.events()).filter(
        ({ phase }) => phase.isApplyExtrinsic && extrinsicIndices.some((index) => phase.asApplyExtrinsic.eq(index)),
      );

      const totalCapacityWithdrawn: bigint = events
        .filter(({ event }) => at.events.capacity.CapacityWithdrawn.is(event))
        .reduce((sum, { event }) => (event as unknown as any).data.amount.toBigInt() + sum, 0n);

      // eslint-disable-next-line no-restricted-syntax
      for (const [txHash, txIndex] of extrinsicIndices) {
        const extrinsicEvents = events.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(txIndex),
        );
        const txStatusStr = await this.cacheManager.hget(RedisUtils.TXN_WATCH_LIST_KEY, txHash);
        const txStatus = JSON.parse(txStatusStr!) as ITxStatus;
        const successEvent = extrinsicEvents.find(
          ({ event }) =>
            event.section === txStatus.successEvent.section && event.method === txStatus.successEvent.method,
        )?.event;
        const failureEvent = extrinsicEvents.find(({ event }) => at.events.system.ExtrinsicFailed.is(event))?.event;

        // TODO: Should the webhook provide for reporting failure?
        if (failureEvent && at.events.system.ExtrinsicFailed.is(failureEvent)) {
          const { dispatchError } = failureEvent.data;
          const moduleThatErrored = dispatchError.asModule;
          const moduleError = dispatchError.registry.findMetaError(moduleThatErrored);
          this.logger.error(`Extrinsic failed with error: ${JSON.stringify(moduleError)}`);
        } else if (successEvent) {
          this.logger.verbose(`Successfully found transaction ${txHash} in block ${currentBlockHash}`);
          const webhook = await this.getWebhook();
          let webhookResponse: Partial<TxWebhookRsp> = {};
          webhookResponse.referenceId = txStatus.referenceId;

          switch (txStatus.type) {
            case TransactionType.CHANGE_HANDLE:
            case TransactionType.CREATE_HANDLE:
              {
                const handleTxnValues = this.blockchainService.handlePublishHandleTxResult(successEvent);

                webhookResponse = createWebhookRsp(txStatus, handleTxnValues.msaId, { handle: handleTxnValues.handle });

                this.logger.debug(handleTxnValues.debugMsg);
                this.logger.log(
                  `Handles: ${webhookResponse.transactionType} finalized handle ${webhookResponse.handle} for msaId ${webhookResponse.msaId}.`,
                );
              }
              break;
            case TransactionType.SIWF_SIGNUP:
              {
                const siwfTxnValues = this.blockchainService.handleSIWFTxnResult(extrinsicEvents);

                webhookResponse = createWebhookRsp(txStatus, siwfTxnValues.msaId, {
                  accountId: siwfTxnValues.address,
                  handle: siwfTxnValues.handle,
                });

                this.logger.log(
                  `SIWF: ${siwfTxnValues.address} Signed up handle ${webhookResponse.handle} for msaId ${webhookResponse.msaId} delegated to provider ${siwfTxnValues.newProvider}.`,
                );
              }
              break;
            case TransactionType.ADD_KEY:
              {
                const publicKeyValues = this.blockchainService.handlePublishKeyTxResult(successEvent);

                webhookResponse = createWebhookRsp(txStatus, publicKeyValues.msaId, {
                  newPublicKey: publicKeyValues.newPublicKey,
                });

                this.logger.debug(publicKeyValues.debugMsg);
                this.logger.log(
                  `Keys: Added the key ${webhookResponse.newPublicKey} for msaId ${webhookResponse.msaId}.`,
                );
              }
              break;
            default:
              this.logger.error(`Unknown transaction type on job.data: ${txStatus.type}`);
              break;
          }

          let retries = 0;
          while (retries < this.configService.healthCheckMaxRetries) {
            try {
              this.logger.debug(`Sending transaction notification to webhook: ${webhook}`);
              this.logger.debug(`Transaction: ${JSON.stringify(webhookResponse)}`);
              await axios.post(webhook, webhookResponse);
              this.logger.debug(`Transaction Notification sent to webhook: ${webhook}`);
              break;
            } catch (error) {
              this.logger.error(`Failed to send notification to webhook: ${webhook}`);
              this.logger.error(error);
              retries += 1;
            }
          }
        } else {
          this.logger.error(`Watched transaction ${txHash} found, but neither success nor error???`);
        }

        pipeline = pipeline.hdel(RedisUtils.TXN_WATCH_LIST_KEY, txHash); // Remove txn from watch list
        const idx = pendingTxns.findIndex((value) => value.txHash === txHash);
        pendingTxns.slice(idx, 1);
      }

      await this.setEpochCapacity(epoch, totalCapacityWithdrawn);
    }

    // Now check all pending transactions for expiration as of this block
    // eslint-disable-next-line no-restricted-syntax
    for (const { birth, death, txHash } of pendingTxns) {
      if (death <= currentBlockNumber) {
        this.logger.verbose(
          `Tx ${txHash} expired (birth: ${birth}, death: ${death}, currentBlock: ${currentBlockNumber})`,
        );
        pipeline = pipeline.hdel(RedisUtils.TXN_WATCH_LIST_KEY, txHash);
        const idx = pendingTxns.findIndex((value) => value.txHash === txHash);
        pendingTxns.slice(idx, 1);
      }
    }

    // Execute marshalled Redis transactions
    await pipeline.exec();
  }

  async getWebhookList(msaId: number): Promise<string[]> {
    const redisKey = `${QueueConstants.REDIS_WATCHER_PREFIX}:${msaId}`;
    const redisList = await this.cacheManager.lrange(redisKey, 0, -1);

    return redisList || [];
  }

  async getWebhook(): Promise<string> {
    return this.configService.providerBaseUrl.toString();
  }
}
