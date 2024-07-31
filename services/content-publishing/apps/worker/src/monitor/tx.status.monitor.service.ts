import { InjectRedis } from '@songkeys/nestjs-redis';
import { Processor, InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import Redis from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { RegistryError } from '@polkadot/types/types';
import { NUMBER_BLOCKS_TO_CRAWL } from '#libs/blockchain/blockchain-constants';
import { BlockchainService } from '#libs/blockchain/blockchain.service';
import { TRANSACTION_RECEIPT_QUEUE_NAME, PUBLISH_QUEUE_NAME } from '#libs/queues/queue.constants';
import { BaseConsumer } from '../BaseConsumer';
import { ITxMonitorJob, IPublisherJob } from '../interfaces';
import { SECONDS_PER_BLOCK } from '#libs/constants';

@Injectable()
@Processor(TRANSACTION_RECEIPT_QUEUE_NAME, {
  concurrency: 2,
})
export class TxStatusMonitoringService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    private blockchainService: BlockchainService,
  ) {
    super();
  }

  async process(job: Job<ITxMonitorJob, any, string>): Promise<any> {
    this.logger.log(`Monitoring job ${job.id} of type ${job.name}`);
    try {
      const numberBlocksToParse = NUMBER_BLOCKS_TO_CRAWL;
      const previousKnownBlockNumber = (
        await this.blockchainService.getBlock(job.data.lastFinalizedBlockHash)
      ).block.header.number.toNumber();
      const currentFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      const blockList: number[] = [];

      for (
        let i = previousKnownBlockNumber;
        i <= currentFinalizedBlockNumber && i < previousKnownBlockNumber + numberBlocksToParse;
        i += 1
      ) {
        blockList.push(i);
      }
      const txResult = await this.blockchainService.crawlBlockListForTx(job.data.txHash, blockList, [
        { pallet: 'system', event: 'ExtrinsicSuccess' },
      ]);

      if (!txResult.found) {
        if (job.attemptsMade < (job.opts.attempts ?? 3)) {
          // if tx has not yet included in a block, throw error to retry till max attempts
          throw new Error(`Tx not found in block list, retrying (attempts=${job.attemptsMade})`);
        } else {
          this.logger.warn(`Could not fetch the transaction adding to publish again! ${job.id}`);
          // could not find the transaction, this might happen if transaction never gets into a block
          await this.retryPublishJob(job.data.referencePublishJob);
        }
      } else {
        // found the tx
        await this.setEpochCapacity(txResult.capacityEpoch ?? 0, txResult.capacityWithdrawn ?? 0n);
        if (txResult.error) {
          this.logger.debug(`Error found in tx result: ${JSON.stringify(txResult.error)}`);
          const errorReport = await this.handleMessagesFailure(job.data.id, txResult.error);

          if (errorReport.pause) {
            await this.publishQueue.pause();
          }

          if (errorReport.retry) {
            await this.retryPublishJob(job.data.referencePublishJob);
          } else {
            throw new UnrecoverableError(`Job ${job.data.id} failed with error ${JSON.stringify(txResult.error)}`);
          }
        }

        if (txResult.success) {
          this.logger.verbose(`Successfully found ${job.data.txHash} found in block ${txResult.blockHash}`);
        }
      }
      return txResult;
    } catch (e) {
      this.logger.error(e);
      throw e;
    } finally {
      // do some stuff
    }
  }

  private async handleMessagesFailure(
    jobId: string,
    moduleError: RegistryError,
  ): Promise<{ pause: boolean; retry: boolean }> {
    try {
      switch (moduleError.method) {
        case 'TooManyMessagesInBlock':
          // Re-try the job in the publish queue
          return { pause: false, retry: true };
        case 'UnAuthorizedDelegate':
        case 'InvalidMessageSourceAccount':
        case 'InvalidSchemaId':
        case 'ExceedsMaxMessagePayloadSizeBytes':
        case 'InvalidPayloadLocation':
        case 'UnsupportedCid':
        case 'InvalidCid':
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

  private async retryPublishJob(publishJob: IPublisherJob) {
    this.logger.debug(`Retrying job ${publishJob.id}`);
    await this.publishQueue.remove(publishJob.id);
    await this.publishQueue.add(`Retrying publish job - ${publishJob.id}`, publishJob, { jobId: publishJob.id });
  }
}
