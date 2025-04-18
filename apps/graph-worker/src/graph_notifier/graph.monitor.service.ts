import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { RegistryError } from '@polkadot/types/types';
import { BlockchainService } from '#blockchain/blockchain.service';
import { BlockchainScannerService } from '#graph-lib/utils/blockchain-scanner.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SignedBlock } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { HexString } from '@polkadot/util/types';
import { IGraphTxStatus } from '#types/interfaces';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';
import * as GraphServiceWebhook from '#graph-lib/types/webhook-types';
import axios from 'axios';
import { ProviderGraphUpdateJob } from '#types/interfaces/graph';
import { REDIS_WEBHOOK_ALL, REDIS_WEBHOOK_PREFIX, SECONDS_PER_BLOCK, TXN_WATCH_LIST_KEY } from '#types/constants';
import scannerConfig, { IScannerConfig } from './scanner.config';
import workerConfig, { IGraphWorkerConfig } from '#graph-worker/worker.config';
import httpCommonConfig, { IHttpCommonConfig } from '#config/http-common.config';

type GraphChangeNotification = GraphServiceWebhook.Components.Schemas.GraphChangeNotificationV1;
type GraphOperationStatus = GraphServiceWebhook.Components.Schemas.GraphOperationStatusV1;
type StatusUpdate = IGraphTxStatus & GraphOperationStatus;

@Injectable()
export class GraphMonitorService extends BlockchainScannerService {
  private graphSchemaIds: number[];

  async onApplicationBootstrap() {
    await this.blockchainService.isReady();
    const schemaResponse: { name: [string, string]; ids: number[] }[] =
      await this.blockchainService.getSchemaNamesToIds([
        ['dsnp', 'public-follows'],
        ['dsnp', 'private-follows'],
        ['dsnp', 'private-connections'],
      ]);
    this.graphSchemaIds = schemaResponse.flatMap(({ ids }) => ids);
    this.logger.log('Monitoring schemas for graph updates: ', this.graphSchemaIds);
    const pendingTxns = await this.cacheManager.hgetall(TXN_WATCH_LIST_KEY);
    // If no transactions pending, skip to end of chain at startup, else, skip to earliest
    /// birth block of a monitored extrinsic if we haven't crawled that far yet
    if (Object.keys(pendingTxns).length === 0) {
      const blockNumber = await this.blockchainService.getLatestBlockNumber();
      this.logger.log(`Skipping to end of the chain to resume scanning (block #${blockNumber})`);
      await this.setLastSeenBlockNumber(blockNumber);
    } else {
      const minBirthBlock = Math.min(
        ...Object.values(pendingTxns)
          .map((jsonStr) => {
            const txStatus = JSON.parse(jsonStr) as IGraphTxStatus;
            return txStatus.birth;
          })
          .sort((a, b) => a - b),
      );
      const lastSeenBlock = await this.getLastSeenBlockNumber();
      this.logger.log('Skipping ahead to monitor submitted extrinsics', { skipTo: minBirthBlock - 1, lastSeenBlock });
      if (lastSeenBlock < minBirthBlock - 1) {
        await this.setLastSeenBlockNumber(minBirthBlock - 1);
      }
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

    await this.publishQueue.close();
    await this.requestQueue.close();
  }

  constructor(
    blockchainService: BlockchainService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRedis() cacheManager: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE) private publishQueue: Queue,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private requestQueue: Queue,
    @Inject(scannerConfig.KEY) private readonly config: IScannerConfig,
    @Inject(workerConfig.KEY) private readonly workerConf: IGraphWorkerConfig,
    @Inject(httpCommonConfig.KEY) private readonly httpConf: IHttpCommonConfig,
    private readonly capacityService: CapacityCheckerService,
  ) {
    super(cacheManager, blockchainService, new Logger(GraphMonitorService.prototype.constructor.name));
    this.scanParameters = { onlyFinalized: this.config.trustUnfinalizedBlocks };
    this.registerChainEventHandler(['capacity.UnStaked', 'capacity.Staked'], () =>
      this.capacityService.checkForSufficientCapacity(),
    );
    this.registerChainEventHandler(
      ['statefulStorage.PaginatedPageUpdated', 'statefulStorage.PaginatedPageDeleted'],
      (block, event) => this.monitorAllGraphUpdates(block, event),
    );
  }

  public get intervalName() {
    return `${this.constructor.name}:blockchainScan`;
  }

  protected async processCurrentBlock(currentBlock: SignedBlock, blockEvents: FrameSystemEventRecord[]): Promise<void> {
    const currentBlockNumber = currentBlock.block.header.number.toNumber();

    // Get set of tx hashes to monitor from cache
    const pendingTxns = (await this.cacheManager.hvals(TXN_WATCH_LIST_KEY)).map(
      (val) => JSON.parse(val) as IGraphTxStatus,
    );

    const extrinsicIndices: [HexString, number][] = [];
    currentBlock.block.extrinsics.forEach((extrinsic, index) => {
      if (pendingTxns.some(({ txHash }) => txHash === extrinsic.hash.toHex())) {
        extrinsicIndices.push([extrinsic.hash.toHex(), index]);
      }
    });

    let pipeline = this.cacheManager.multi({ pipeline: true });

    const statusesToReport: StatusUpdate[] = [];

    if (extrinsicIndices.length > 0) {
      const epoch = await this.blockchainService.getCurrentCapacityEpoch(currentBlock.block.header.hash);
      const events: FrameSystemEventRecord[] = blockEvents.filter(
        ({ phase }) => phase.isApplyExtrinsic && extrinsicIndices.some((index) => phase.asApplyExtrinsic.eq(index)),
      );

      const totalCapacityWithdrawn: bigint = events.reduce((sum, { event }) => {
        if (this.blockchainService.events.capacity.CapacityWithdrawn.is(event)) {
          return sum + event.data.amount.toBigInt();
        }
        return sum;
      }, 0n);

      // eslint-disable-next-line no-restricted-syntax
      for (const [txHash, txIndex] of extrinsicIndices) {
        const extrinsicEvents = events.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(txIndex),
        );
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const txStatusStr = (await this.cacheManager.hget(TXN_WATCH_LIST_KEY, txHash))!;
        const txStatus = JSON.parse(txStatusStr) as IGraphTxStatus;
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
          const errorReport = this.handleMessagesFailure(moduleError);

          if (errorReport.pause) {
            await this.publishQueue.pause();
          }

          if (errorReport.retry) {
            await this.retryGraphUpdate(txStatus.referenceJob);
          } else {
            statusesToReport.push({ ...txStatus, status: 'failed' });
          }
        } else if (successEvent) {
          this.logger.verbose(`Successfully found transaction ${txHash} in block ${currentBlockNumber}`);
          statusesToReport.push({ ...txStatus, status: 'succeeded' });
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

    // Now check all remaining transactions for expiration as of this block
    // eslint-disable-next-line no-restricted-syntax
    for (const txStatus of pendingTxns) {
      if (txStatus.death <= currentBlockNumber) {
        this.logger.warn(
          `Tx ${txStatus.txHash} expired (birth: ${txStatus.birth}, death: ${txStatus.death}, currentBlock: ${currentBlockNumber}), adding back to the publishing queue`,
        );
        // could not find the transaction, this might happen if transaction never gets into a block
        statusesToReport.push({ ...txStatus, status: 'expired' });
        pipeline = pipeline.hdel(TXN_WATCH_LIST_KEY, txStatus.txHash);
      }
    }

    // Execute marshalled Redis transactions
    await pipeline.exec();
    await Promise.allSettled([statusesToReport.map((status) => this.sendGraphOperationStatusUpdate(status))]);
  }

  private async sendGraphOperationStatusUpdate(statusToReport: StatusUpdate) {
    const webhook = statusToReport.referenceJob.webhookUrl;
    if (webhook) {
      let retries = 0;
      while (retries < this.workerConf.webhookFailureThreshold) {
        try {
          this.logger.debug(
            `Sending graph operation status (${statusToReport.status}) notification for refId ${statusToReport.referenceId} to webhook: ${webhook}`,
          );
          await axios.post(
            webhook,
            { referenceId: statusToReport.referenceId, status: statusToReport.status },
            { timeout: this.httpConf.httpResponseTimeoutMS },
          );
          break;
        } catch (error: any) {
          this.logger.error(`Failed to send status to webhook: ${webhook}`, error, error?.stack);
          retries += 1;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => {
            setTimeout(r, this.workerConf.webhookRetryIntervalSeconds * MILLISECONDS_PER_SECOND);
          });
        }
      }
    }
  }

  private handleMessagesFailure(moduleError: RegistryError): { pause: boolean; retry: boolean } {
    switch (moduleError.method) {
      case 'PageIdExceedsMaxAllowed':
      case 'PageExceedsMaxPageSizeBytes':
      case 'InvalidSchemaId':
      case 'UnsupportedOperationForSchema':
      case 'SchemaPayloadLocationMismatch':
      case 'InvalidMessageSourceAccount':
      case 'UnauthorizedDelegate':
      case 'CorruptedState':
      case 'InvalidItemAction':
      case 'InvalidSignature':
        return { pause: false, retry: false };
      case 'StalePageState':
      case 'ProofHasExpired':
      case 'ProofNotYetValid':
        return { pause: false, retry: true };
      default:
        this.logger.error(`Unknown module error ${moduleError}`);
        return { pause: false, retry: false };
    }
  }

  private async setEpochCapacity(epoch: number, capacityWithdrawn: bigint): Promise<void> {
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

  private async retryGraphUpdate(requestJob: ProviderGraphUpdateJob) {
    this.logger.debug(`Retrying job ${requestJob.referenceId}`);
    await this.requestQueue.remove(requestJob.referenceId);
    await this.requestQueue.add(`Retrying publish job - ${requestJob.referenceId}`, requestJob, {
      jobId: requestJob.referenceId,
    });
  }

  public async monitorAllGraphUpdates(block: SignedBlock, { event }: FrameSystemEventRecord) {
    // Don't need this check logically, but it's a type guard to be able to access the specific event type data
    if (
      this.blockchainService.events.statefulStorage.PaginatedPageUpdated.is(event) ||
      this.blockchainService.events.statefulStorage.PaginatedPageDeleted.is(event)
    ) {
      const schemaId = event.data.schemaId.toNumber();
      if (!this.graphSchemaIds.some((id) => id === schemaId)) {
        return;
      }

      const graphUpdateNotification: GraphChangeNotification = {
        msaId: event.data.msaId.toString(),
        pageId: event.data.pageId.toNumber(),
        schemaId: event.data.schemaId.toNumber(),
        prevContentHash: event.data.prevContentHash.toNumber(),
        updateType: 'GraphPageDeleted',
      };

      if (this.blockchainService.events.statefulStorage.PaginatedPageUpdated.is(event)) {
        graphUpdateNotification.currContentHash = event.data.currContentHash.toNumber();
        graphUpdateNotification.updateType = 'GraphPageUpdated';
      }

      // TODO: send out notifications of all graph updates to registered webhooks
      this.logger.verbose(
        `Found graph update in block #${block.block.header.number.toNumber()}`,
        JSON.stringify(graphUpdateNotification),
      );
      const webhookList = await this.getWebhookList(graphUpdateNotification.msaId);
      this.logger.debug(`Found ${webhookList.length} webhooks for ${graphUpdateNotification.msaId}`);
      await Promise.allSettled(
        webhookList.map(async (webhookUrl) => {
          let retries = 0;
          while (retries < this.workerConf.webhookFailureThreshold) {
            try {
              this.logger.debug(`Sending graph change notification to webhook: ${webhookUrl}`);
              this.logger.debug(`Graph Change: ${JSON.stringify(graphUpdateNotification)}`);
              // eslint-disable-next-line no-await-in-loop
              this.logger.debug(`[Graph] Sending graph update to webhook: ${webhookUrl}`);
              this.logger.debug(`[Graph] Request payload:`, graphUpdateNotification);
              this.logger.debug(`[Graph] Timeout setting: ${this.httpConf.httpResponseTimeoutMS}ms`);

              try {
                await axios.post(webhookUrl, graphUpdateNotification, { timeout: this.httpConf.httpResponseTimeoutMS });
                this.logger.debug(`[Graph] Update sent successfully to webhook: ${webhookUrl}`);
              } catch (error) {
                this.logger.error(`[Graph] Failed to send update to webhook: ${webhookUrl}`);

                if (axios.isAxiosError(error)) {
                  this.logger.error('[Graph] Axios Error Details:');
                  this.logger.error(`- Message: ${error.message}`);
                  this.logger.error(`- Code: ${error.code}`);
                  this.logger.error(`- Status: ${error.response?.status}`);
                  this.logger.error(`- Status Text: ${error.response?.statusText}`);
                  this.logger.error(`- Request Config:`, {
                    method: error.config?.method,
                    url: error.config?.url,
                    timeout: error.config?.timeout,
                    headers: error.config?.headers,
                  });
                  if (error.response?.data) {
                    this.logger.error(`- Response Data:`, error.response.data);
                  }
                } else {
                  this.logger.error('[Graph] Non-Axios Error:', error);
                }
                throw error;
              }
              this.logger.debug(`Notification sent to webhook: ${webhookUrl}`);
              break;
            } catch (error) {
              this.logger.error(`Failed to send notification to webhook: ${webhookUrl}`);
              this.logger.error(error);
              retries += 1;
              // eslint-disable-next-line no-await-in-loop
              await new Promise((r) => {
                setTimeout(r, this.workerConf.webhookRetryIntervalSeconds * MILLISECONDS_PER_SECOND);
              });
            }
          }
        }),
      );
    }
  }

  /**
   * Return all URLs registered as webhooks for the given MSA
   *
   * @param {string} msaId - MSA to retrieve webhooks for
   * @param {boolean} includeAll - Whether to include webhooks registered for 'all'
   * @returns {string[]} Array of URLs
   */
  public async getWebhookList(msaId: string, includeAll = true): Promise<string[]> {
    const value = await this.cacheManager.hget(REDIS_WEBHOOK_PREFIX, msaId);
    let webhooks = value ? (JSON.parse(value) as string[]) : [];

    if (includeAll) {
      const all = await this.cacheManager.hget(REDIS_WEBHOOK_PREFIX, REDIS_WEBHOOK_ALL);
      const allHooks = all ? (JSON.parse(all) as string[]) : [];
      webhooks.push(...allHooks);
      webhooks = [...new Set(webhooks)];
    }

    return webhooks;
  }
}
