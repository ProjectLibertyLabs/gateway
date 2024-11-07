 
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import axios from 'axios';
import { BlockchainService } from '#blockchain/blockchain.service';
import { SECONDS_PER_BLOCK } from '#types/constants/blockchain-constants';
import { createWebhookRsp } from '#account-worker/transaction_notifier/notifier.service.helper.createWebhookRsp';
import { BlockchainScannerService } from '#account-lib/utils/blockchain-scanner.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SignedBlock } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { ITxStatus } from '#account-lib/interfaces/tx-status.interface';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { ACCOUNT_SERVICE_WATCHER_PREFIX, TXN_WATCH_LIST_KEY } from '#types/constants';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import { TransactionType, TxWebhookRsp } from '#types/account-webhook';
import accountWorkerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';

@Injectable()
export class TxnNotifierService
  extends BlockchainScannerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  async onApplicationBootstrap() {
    await this.blockchainService.isReady();
    const pendingTxns = await this.cacheManager.hkeys(TXN_WATCH_LIST_KEY);
    // If no transactions pending, skip to end of chain at startup
    if (pendingTxns.length === 0) {
      const blockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      await this.setLastSeenBlockNumber(blockNumber);
    }
    this.schedulerRegistry.addInterval(
      this.intervalName,
      setInterval(() => this.scan(), this.config.blockchainScanIntervalSeconds * MILLISECONDS_PER_SECOND),
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
    @Inject(accountWorkerConfig.KEY) private readonly config: IAccountWorkerConfig,
    private readonly capacityService: CapacityCheckerService,
  ) {
    super(cacheManager, blockchainService, new Logger(TxnNotifierService.prototype.constructor.name));
    this.scanParameters = { onlyFinalized: this.config.trustUnfinalizedBlocks };
    this.registerChainEventHandler(['capacity.UnStaked', 'capacity.Staked'], () =>
      this.capacityService.checkForSufficientCapacity(),
    );
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

  public async getLastSeenBlockNumber(): Promise<number> {
    let blockNumber = await super.getLastSeenBlockNumber();
    const pendingTxns = await this.cacheManager.hvals(TXN_WATCH_LIST_KEY);
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

  async processCurrentBlock(currentBlock: SignedBlock, blockEvents: FrameSystemEventRecord[]): Promise<void> {
    const currentBlockNumber = currentBlock.block.header.number.toNumber();

    // Get set of tx hashes to monitor from cache
    const pendingTxns = (await this.cacheManager.hvals(TXN_WATCH_LIST_KEY)).map((val) => JSON.parse(val) as ITxStatus);

    const extrinsicIndices: [HexString, number][] = [];
    currentBlock.block.extrinsics.forEach((extrinsic, index) => {
      if (pendingTxns.some(({ txHash }) => txHash === extrinsic.hash.toHex())) {
        extrinsicIndices.push([extrinsic.hash.toHex(), index]);
      }
    });

    let pipeline = this.cacheManager.multi({ pipeline: true });

    if (extrinsicIndices.length > 0) {
      const epoch = await this.blockchainService.getCurrentCapacityEpoch();
      const events: FrameSystemEventRecord[] = blockEvents.filter(
        ({ phase }) => phase.isApplyExtrinsic && extrinsicIndices.some((index) => phase.asApplyExtrinsic.eq(index)),
      );

      const totalCapacityWithdrawn: bigint = events
        .filter(({ event }) => this.blockchainService.events.capacity.CapacityWithdrawn.is(event))
        .reduce((sum, { event }) => (event as unknown as any).data.amount.toBigInt() + sum, 0n);

       
      for (const [txHash, txIndex] of extrinsicIndices) {
        const extrinsicEvents = events.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(txIndex),
        );
        const txStatusStr = await this.cacheManager.hget(TXN_WATCH_LIST_KEY, txHash);
        const txStatus = JSON.parse(txStatusStr!) as ITxStatus;
        const successEvent = extrinsicEvents.find(
          ({ event }) =>
            event.section === txStatus.successEvent.section && event.method === txStatus.successEvent.method,
        )?.event;
        const failureEvent = extrinsicEvents.find(({ event }) =>
          this.blockchainService.events.system.ExtrinsicFailed.is(event),
        )?.event;

        // TODO: Should the webhook provide for reporting failure?
        if (failureEvent && this.blockchainService.events.system.ExtrinsicFailed.is(failureEvent)) {
          const { dispatchError } = failureEvent.data;
          const moduleThatErrored = dispatchError.asModule;
          const moduleError = dispatchError.registry.findMetaError(moduleThatErrored);
          this.logger.error(`Extrinsic failed with error: ${JSON.stringify(moduleError)}`);
        } else if (successEvent) {
          this.logger.verbose(`Successfully found transaction ${txHash} in block ${currentBlockNumber}`);
          const webhook = await this.getWebhook();
          let webhookResponse: Partial<TxWebhookRsp> = {};
          webhookResponse.referenceId = txStatus.referenceId;

          switch (txStatus.type) {
            case TransactionType.CHANGE_HANDLE:
            case TransactionType.CREATE_HANDLE:
              {
                const handleTxnValues = this.blockchainService.handlePublishHandleTxResult(successEvent);

                const response = createWebhookRsp(txStatus, handleTxnValues.msaId, { handle: handleTxnValues.handle });
                webhookResponse = response;

                this.logger.debug(handleTxnValues.debugMsg);
                this.logger.log(
                  `Handles: ${response.transactionType} finalized handle ${response.handle} for msaId ${response.msaId}.`,
                );
              }
              break;

            case TransactionType.SIWF_SIGNUP:
              {
                const siwfTxnValues = await this.blockchainService.handleSIWFTxnResult(extrinsicEvents);

                const response = createWebhookRsp(txStatus, siwfTxnValues.msaId, {
                  accountId: siwfTxnValues.address,
                  handle: siwfTxnValues.handle,
                });
                webhookResponse = response;

                this.logger.log(
                  `SIWF: ${siwfTxnValues.address} Signed up handle ${response.handle} for msaId ${response.msaId} delegated to provider ${siwfTxnValues.newProvider}.`,
                );
              }
              break;

            case TransactionType.ADD_KEY:
              {
                const publicKeyValues = this.blockchainService.handlePublishKeyTxResult(successEvent);

                const response = createWebhookRsp(txStatus, publicKeyValues.msaId, {
                  newPublicKey: publicKeyValues.newPublicKey,
                });
                webhookResponse = response;

                this.logger.log(`Keys: Added the key ${response.newPublicKey} for msaId ${response.msaId}.`);
              }
              break;

            case TransactionType.ADD_PUBLIC_KEY_AGREEMENT:
              {
                const itemizedPageUpdated =
                  this.blockchainService.handlePublishPublicKeyAgreementTxResult(successEvent);

                const response = createWebhookRsp(txStatus, itemizedPageUpdated.msaId, {
                  schemaId: itemizedPageUpdated.schemaId,
                });
                webhookResponse = response;

                this.logger.log(`Keys: Added the graph key msaId ${response.msaId} and schemaId ${response.schemaId}.`);
              }
              break;

            case TransactionType.RETIRE_MSA:
              {
                const msaRetired = this.blockchainService.handleRetireMsaTxResult(successEvent);
                const response = createWebhookRsp(txStatus, msaRetired.msaId);
                webhookResponse = response;
              }
              break;

            case TransactionType.REVOKE_DELEGATION:
              {
                const delegationRevoked = this.blockchainService.handleRevokeDelegationTxResult(successEvent);
                const response = createWebhookRsp(
                  { ...txStatus, providerId: delegationRevoked.providerId },
                  delegationRevoked.msaId,
                );
                webhookResponse = response;
              }
              break;

            default:
              this.logger.error(`Unknown transaction type on job.data: ${txStatus.type}`);
              break;
          }

          let retries = 0;
          while (retries < this.config.healthCheckMaxRetries) {
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
          this.logger.error(
            `Watched transaction ${txHash} found in block ${currentBlockNumber}, but did not find event '${txStatus.successEvent.section}.${txStatus.successEvent.method}' in block`,
          );
        }

        pipeline = pipeline.hdel(TXN_WATCH_LIST_KEY, txHash); // Remove txn from watch list
        const idx = pendingTxns.findIndex((value) => value.txHash === txHash);
        pendingTxns.slice(idx, 1);
      }

      await this.setEpochCapacity(epoch, totalCapacityWithdrawn);
    }

    // Now check all pending transactions for expiration as of this block
     
    for (const { birth, death, txHash } of pendingTxns) {
      if (death <= currentBlockNumber) {
        this.logger.verbose(
          `Tx ${txHash} expired (birth: ${birth}, death: ${death}, currentBlock: ${currentBlockNumber})`,
        );
        pipeline = pipeline.hdel(TXN_WATCH_LIST_KEY, txHash);
        const idx = pendingTxns.findIndex((value) => value.txHash === txHash);
        pendingTxns.slice(idx, 1);
      }
    }

    // Execute marshalled Redis transactions
    await pipeline.exec();
  }

  async getWebhookList(msaId: number): Promise<string[]> {
    const redisKey = `${ACCOUNT_SERVICE_WATCHER_PREFIX}:${msaId}`;
    const redisList = await this.cacheManager.lrange(redisKey, 0, -1);

    return redisList || [];
  }

  async getWebhook(): Promise<string> {
    return this.config.webhookBaseUrl.toString();
  }
}
