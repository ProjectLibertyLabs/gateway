import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { RegistryError } from '@polkadot/types/types';
import axios from 'axios';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { GraphChangeNotificationDto, GraphStateManager, ProviderGraphUpdateJob, QueueConstants, SECONDS_PER_BLOCK } from '../../../../libs/common/src';
import { BaseConsumer } from '../BaseConsumer';
import { ITxMonitorJob } from '../../../../libs/common/src/dtos/graph.notifier.job';
import { BlockchainConstants } from '../../../../libs/common/src/blockchain/blockchain-constants';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';

@Injectable()
@Processor(QueueConstants.GRAPH_CHANGE_NOTIFY_QUEUE)
export class GraphNotifierService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private changeRequestQueue: Queue,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_PUBLISH_QUEUE) private publishQueue: Queue,
    @InjectQueue(QueueConstants.RECONNECT_REQUEST_QUEUE) private reconnectionQueue: Queue,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
    private graphStateManager: GraphStateManager,
  ) {
    super();
  }

  async process(job: Job<ITxMonitorJob, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      const numberBlocksToParse = BlockchainConstants.NUMBER_BLOCKS_TO_CRAWL;
      const txCapacityEpoch = job.data.epoch;
      const previousKnownBlockNumber = (await this.blockchainService.getBlock(job.data.lastFinalizedBlockHash)).block.header.number.toBigInt();
      const currentFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      const blockList: bigint[] = [];

      for (let i = previousKnownBlockNumber; i <= currentFinalizedBlockNumber && i < previousKnownBlockNumber + numberBlocksToParse; i += 1n) {
        blockList.push(i);
      }
      const txResult = await this.blockchainService.crawlBlockListForTx(job.data.txHash, blockList, [{ pallet: 'system', event: 'ExtrinsicSuccess' }]);
      if (!txResult.found) {
        this.logger.error(`Tx ${job.data.txHash} not found in block list`);
        throw new Error(`Tx ${job.data.txHash} not found in block list`);
      } else {
        // Set current epoch capacity
        await this.setEpochCapacity(txCapacityEpoch, BigInt(txResult.capacityWithDrawn ?? 0n));
        if (txResult.error) {
          this.logger.debug(`Error found in tx result: ${JSON.stringify(txResult.error)}`);
          const errorReport = await this.handleMessagesFailure(txResult.error);
          if (errorReport.pause) {
            this.logger.debug(`Pausing queue ${job.data.referencePublishJob.referenceId}`);
            await this.changeRequestQueue.pause();
            await this.publishQueue.pause();
            await this.reconnectionQueue.pause();
          }
          if (errorReport.retry) {
            await this.retryRequestJob(job.data.referencePublishJob.referenceId);
          } else {
            throw new Error(`Job ${job.data.id} failed with error ${JSON.stringify(txResult.error)}`);
          }
        }

        if (txResult.success) {
          await this.removeSuccessJobs(job.data.referencePublishJob.referenceId);
          this.logger.verbose(`Successfully found ${job.data.txHash} found in block ${txResult.blockHash}`);
          // Get DSNPGraphEdge from debounced queue and send to webhooks
          const webhookList = await this.getWebhookList(job.data.referencePublishJob.update.ownerDsnpUserId);
          this.logger.debug(`Found ${webhookList.length} webhooks for ${job.data.referencePublishJob.update.ownerDsnpUserId}`);
          const notification: GraphChangeNotificationDto = {
            dsnpId: job.data.referencePublishJob.update.ownerDsnpUserId,
            update: job.data.referencePublishJob.update,
          };

          webhookList.forEach(async (webhookUrl) => {
            let retries = 0;
            while (retries < this.configService.getHealthCheckMaxRetries()) {
              try {
                this.logger.debug(`Sending graph change notification to webhook: ${webhookUrl}`);
                this.logger.debug(`Graph Change: ${JSON.stringify(notification)}`);
                // eslint-disable-next-line no-await-in-loop
                await axios.post(webhookUrl, notification);
                this.logger.debug(`Notification sent to webhook: ${webhookUrl}`);
                break;
              } catch (error) {
                this.logger.error(`Failed to send notification to webhook: ${webhookUrl}`);
                this.logger.error(error);
                retries += 1;
              }
            }
          });
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
    this.publishQueue.remove(referenceId);
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
      removeOnFail: false,
      removeOnComplete: false,
    });
  }

  private async setEpochCapacity(epoch: string, capacityWithdrew: bigint): Promise<void> {
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

  async getWebhookList(dsnpId: string): Promise<string[]> {
    const redisKey = `${QueueConstants.REDIS_WATCHER_PREFIX}:${dsnpId}`;
    const redisList = await this.cacheManager.lrange(redisKey, 0, -1);

    return redisList || [];
  }
}
