import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import Redis from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { RegistryError } from '@polkadot/types/types';
import axios from 'axios';
import { BaseConsumer, AsyncDebouncerService, BlockchainService, GraphStateManager, ITxMonitorJob, ProviderGraphUpdateJob, SECONDS_PER_BLOCK, ConfigService } from '#lib';
import * as QueueConstants from '#lib/utils/queues';
import * as RedisConstants from '#lib/utils/redis';
import * as BlockchainConstants from '#lib/blockchain/blockchain-constants';
import * as GraphServiceWebhook from '#lib/types/webhook-types';

type GraphChangeNotification = GraphServiceWebhook.Components.Schemas.GraphChangeNotification;
type GraphOperationStatus = GraphServiceWebhook.Components.Schemas.GraphOperationStatus;

@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_NOTIFY_QUEUE)
export class GraphNotifierService extends BaseConsumer {
  private asyncDebouncerService: AsyncDebouncerService;

  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private changeRequestQueue: Queue,
    @InjectQueue(QueueConstants.RECONNECT_REQUEST_QUEUE) private reconnectionQueue: Queue,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
    private graphStateManager: GraphStateManager,
  ) {
    super();
    this.asyncDebouncerService = new AsyncDebouncerService(this.cacheManager, this.configService, this.graphStateManager);
  }

  async process(job: Job<ITxMonitorJob, any, string>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      const numberBlocksToParse = BlockchainConstants.NUMBER_BLOCKS_TO_CRAWL;
      const previousKnownBlockNumber = (await this.blockchainService.getBlock(job.data.lastFinalizedBlockHash)).block.header.number.toBigInt();
      const currentFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      const blockList: bigint[] = [];

      for (let i = previousKnownBlockNumber; i <= currentFinalizedBlockNumber && i < previousKnownBlockNumber + numberBlocksToParse; i += 1n) {
        blockList.push(i);
      }

      const notification: GraphOperationStatus = {
        referenceId: job.data.referencePublishJob.referenceId,
        status: 'pending',
      };

      try {
        const txResult = await this.blockchainService.crawlBlockListForTx(job.data.txHash, blockList, [{ pallet: 'system', event: 'ExtrinsicSuccess' }]);
        if (!txResult.found) {
          this.logger.error(`Tx ${job.data.txHash} not found in block list`);
          // TODO: implement a blockchain scanner with mortality checks for expiration.
          // For now, if we fail more times than this job queue will allow, consider the operation expired.
          if (job.attemptsMade >= (this.changeRequestQueue.jobsOpts.attempts || 1)) {
            notification.status = 'expired';
          }
          throw new Error(`Tx ${job.data.txHash} not found in block list`);
        } else {
          // Set current epoch capacity
          await this.setEpochCapacity(txResult.capacityEpoch ?? 0, txResult.capacityWithDrawn ?? 0n);

          if (txResult.error) {
            this.logger.debug(`Error found in tx result: ${JSON.stringify(txResult.error)}`);
            const errorReport = await this.handleMessagesFailure(txResult.error);
            if (errorReport.pause) {
              this.logger.debug(`Pausing queue ${job.data.referencePublishJob.referenceId}`);
              await this.changeRequestQueue.pause();
              await this.reconnectionQueue.pause();
            }
            if (errorReport.retry) {
              await this.retryRequestJob(job.data.referencePublishJob.referenceId);
            } else {
              notification.status = 'failed';
            }
            throw new UnrecoverableError(`Job ${job.data.id} failed with error ${JSON.stringify(txResult.error)}`);
          }

          if (txResult.success) {
            this.logger.verbose(`Successfully found ${job.data.txHash} found in block ${txResult.blockHash}`);
            notification.status = 'succeeded';
            const webhookList = await this.getWebhookList(job.data.referencePublishJob.update.ownerDsnpUserId);
            this.logger.debug(`Found ${webhookList.length} webhooks for ${job.data.referencePublishJob.update.ownerDsnpUserId}`);
            const requestJob: Job<ProviderGraphUpdateJob, any, string> | undefined = await this.changeRequestQueue.getJob(job.data.referencePublishJob.referenceId);

            if (job.data.referencePublishJob.update.type !== 'AddKey') {
              this.logger.debug(`Setting graph for ${job.data.referencePublishJob.update.ownerDsnpUserId}`);
              const graphKeyPairs = requestJob?.data.graphKeyPairs ?? [];
              const { ownerDsnpUserId, schemaId } = job.data.referencePublishJob.update;
              const graphEdges = await this.asyncDebouncerService.setGraphForSchemaId(ownerDsnpUserId, schemaId, graphKeyPairs);
              if (graphEdges.length === 0) {
                this.logger.debug(`No graph edges found for ${ownerDsnpUserId}`);
              }
            }
            const graphUpdateNotification: GraphChangeNotification = {
              msaId: job.data.referencePublishJob.update.ownerDsnpUserId,
              update: job.data.referencePublishJob.update,
            };

            // TODO: This should be moved elsewhere, likely need a blockchain scanner. This piece of code
            // will only invoke the webhook for graph updates that we submitted. We likely want to monitor all
            // graph updates, presuming the intent of "watch graph updates" is to watch for unsolicited graph updates on-chain.
            // Here, we likely only want to notify the original submitter of this particular graph update.
            webhookList.forEach(async (webhookUrl) => {
              let retries = 0;
              while (retries < this.configService.getHealthCheckMaxRetries()) {
                try {
                  this.logger.debug(`Sending graph change notification to webhook: ${webhookUrl}`);
                  this.logger.debug(`Graph Change: ${JSON.stringify(notification)}`);
                  // eslint-disable-next-line no-await-in-loop
                  await axios.post(webhookUrl, graphUpdateNotification);
                  this.logger.debug(`Notification sent to webhook: ${webhookUrl}`);
                  break;
                } catch (error) {
                  this.logger.error(`Failed to send notification to webhook: ${webhookUrl}`);
                  this.logger.error(error);
                  retries += 1;
                }
              }
            });
            await this.removeSuccessJobs(job.data.referencePublishJob.referenceId);
          }
        }
      } finally {
        if (notification.status !== 'pending') {
          const webhook = job.data.referencePublishJob.webhookUrl;
          if (webhook) {
            let retries = 0;
            while (retries < this.configService.getHealthCheckMaxRetries()) {
              try {
                this.logger.debug(`Sending graph operation status (${notification.status}) notification for refId ${notification.referenceId} to webhook: ${webhook}`);
                await axios.post(webhook, notification);
                break;
              } catch (error: any) {
                this.logger.error(`Failed to send status to webhook: ${webhook}`, error, error?.stack);
                retries += 1;
              }
            }
          }
        }
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  private async removeSuccessJobs(referenceId: string): Promise<void> {
    this.logger.debug(`Removing success jobs for ${referenceId}`);
    this.changeRequestQueue.remove(referenceId);
    this.reconnectionQueue.remove(referenceId);
  }

  private async retryRequestJob(requestReferenceId: string): Promise<void> {
    this.logger.debug(`Retrying graph change request job ${requestReferenceId}`);
    const requestJob: Job<ProviderGraphUpdateJob, any, string> | undefined = await this.changeRequestQueue.getJob(requestReferenceId);
    if (!requestJob) {
      this.logger.debug(`Job ${requestReferenceId} not found in queue`);
      return;
    }
    await this.changeRequestQueue.remove(requestReferenceId);
    await this.changeRequestQueue.add(`Retrying publish job - ${requestReferenceId}`, requestJob.data, {
      jobId: requestReferenceId,
    });
  }

  private async setEpochCapacity(epoch: number, capacityWithdrew: bigint): Promise<void> {
    const epochCapacityKey = `epochCapacity:${epoch}`;

    try {
      const savedCapacity = await this.cacheManager.get(epochCapacityKey);
      const epochCapacity = BigInt(savedCapacity ?? 0);
      const newEpochCapacity = epochCapacity + capacityWithdrew;

      const epochDurationBlocks = await this.blockchainService.getCurrentEpochLength();
      const epochDuration = epochDurationBlocks * SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND;
      await this.cacheManager.setex(epochCapacityKey, epochDuration, newEpochCapacity.toString());
    } catch (error) {
      this.logger.error(`Error setting epoch capacity: ${error}`);
    }
  }

  private async handleMessagesFailure(moduleError: RegistryError): Promise<{ pause: boolean; retry: boolean }> {
    try {
      switch (moduleError.method) {
        case 'StalePageState':
        case 'ProofHasExpired':
        case 'ProofNotYetValid':
        case 'InvalidSignature':
          // Re-try the job in the request change queue
          return { pause: false, retry: true };
        case 'InvalidSchemaId':
          return { pause: true, retry: false };
        case 'InvalidMessageSourceAccount':
        case 'UnauthorizedDelegate':
        case 'CorruptedState':
        case 'InvalidItemAction':
        case 'PageIdExceedsMaxAllowed':
        case 'PageExceedsMaxPageSizeBytes':
        case 'UnsupportedOperationForSchema':
        case 'InvalidPayloadLocation':
        case 'SchemaPayloadLocationMismatch':
          // fail the job since this is unrecoverable
          return { pause: false, retry: false };
        default:
          this.logger.error(`Unknown module error ${moduleError}`);
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling module error: ${error}`);
    }

    // unknown error, pause the queue
    return { pause: false, retry: false };
  }

  /**
   * Return all URLs registered as webhooks for the given MSA
   *
   * @param {string} msaId - MSA to retrieve webhooks for
   * @param {boolean} includeAll - Whether to include webhooks registered for 'all'
   * @returns {string[]} Array of URLs
   */
  async getWebhookList(msaId: string, includeAll = true): Promise<string[]> {
    const value = await this.cacheManager.hget(RedisConstants.REDIS_WEBHOOK_PREFIX, msaId);
    let webhooks = value ? (JSON.parse(value) as string[]) : [];

    if (includeAll) {
      const all = await this.cacheManager.hget(RedisConstants.REDIS_WEBHOOK_PREFIX, RedisConstants.REDIS_WEBHOOK_ALL);
      const allHooks = all ? (JSON.parse(all) as string[]) : [];
      webhooks.push(...allHooks);
      webhooks = [...new Set(webhooks)];
    }

    return webhooks;
  }
}
