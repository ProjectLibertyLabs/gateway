import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor, InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { ITxMonitorJob } from '../interfaces/status-monitor.interface';
import { QueueConstants } from '../../../../libs/common/src';
import { SECONDS_PER_BLOCK } from '../../../../libs/common/src/constants';
import { BlockchainConstants } from '../../../../libs/common/src/blockchain/blockchain-constants';
import { BaseConsumer } from '../BaseConsumer';

@Injectable()
@Processor(QueueConstants.TRANSACTION_RECEIPT_QUEUE_NAME, {
  concurrency: 2,
})
export class TxStatusMonitoringService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.TRANSACTION_RECEIPT_QUEUE_NAME) private txReceiptQueue,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<ITxMonitorJob, any, string>): Promise<any> {
    this.logger.log(`Monitoring job ${job.id} of type ${job.name}`);
    try {
      const numberBlocksToParse = BlockchainConstants.NUMBER_BLOCKS_TO_CRAWL;
      const txCapacityEpoch = job.data.epoch;
      const previousKnownBlockNumber = (await this.blockchainService.getBlock(job.data.lastFinalizedBlockHash)).block.header.number.toBigInt();
      const currentFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
      const blockList: bigint[] = [];
      for (let i = previousKnownBlockNumber; i <= currentFinalizedBlockNumber && i < previousKnownBlockNumber + numberBlocksToParse; i += 1n) {
        blockList.push(i);
      }
      const txBlockHash = await this.crawlBlockList(job.data.txHash, txCapacityEpoch, blockList);

      if (txBlockHash) {
        this.logger.verbose(`Successfully completed job ${job.id}`);
        return { success: true };
      }

      // handle failure to find tx in block list after
      // TODO - handle requeing of publish job in case of failure
      // Issue: https://github.com/AmplicaLabs/content-publishing-service/issues/18
      if (!txBlockHash && job.attemptsMade >= (job.opts.attempts ?? 3)) {
        this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts`);
        return { success: false };
      }
      throw new Error(`Job ${job.id} failed, retrying`);
    } catch (e) {
      this.logger.error(`Job ${job.id} failed (attempts=${job.attemptsMade}) with error: ${e}`);
      throw e;
    } finally {
      // do some stuff
    }
  }

  private async crawlBlockList(txHash: Hash, epoch: string, blockList: bigint[]): Promise<BlockHash | undefined> {
    const txReceiptPromises: Promise<BlockHash | undefined>[] = blockList.map(async (blockNumber) => {
      const blockHash = await this.blockchainService.getBlockHash(blockNumber);
      const block = await this.blockchainService.getBlock(blockHash);
      const txInfo = block.block.extrinsics.find((extrinsic) => extrinsic.hash.toString() === txHash.toString());
      this.logger.debug(`Extrinsics: ${block.block.extrinsics[0]}`);

      if (txInfo !== undefined) {
        this.logger.verbose(`Found tx ${txHash} in block ${blockNumber}`);
        const at = await this.blockchainService.api.at(blockHash.toHex());
        const events = await at.query.system.events();
        events.subscribe((records) => {
          records.forEach(async (record) => {
            const { event } = record;
            const eventName = event.section;
            const { method } = event;
            const { data } = event;
            this.logger.debug(`Received event: ${eventName} ${method} ${data}`);
            if (eventName.search('capacity') !== -1 && method.search('Withdrawn') !== -1) {
              const capacityWithDrawn = BigInt(data[1].toString());
              this.logger.debug(`Capacity withdrawn: ${capacityWithDrawn}`);
              this.setEpochCapacity(epoch, capacityWithDrawn);
            }
          });
        });
        return blockHash;
      }
      return undefined;
    });

    const results = await Promise.all(txReceiptPromises);
    const result = results.find((blockHash) => blockHash !== undefined);
    return result;
  }

  private async setEpochCapacity(epoch: string, capacityWithdrew: bigint) {
    const epochCapacityKey = `epochCapacity:${epoch}`;

    try {
      const epochCapacity = BigInt((await this.cacheManager.get(epochCapacityKey)) ?? 0);
      const newEpochCapacity = epochCapacity + capacityWithdrew;

      const epochDurationBlocks = await this.blockchainService.getCurrentEpochLength();
      const epochDuration = epochDurationBlocks * SECONDS_PER_BLOCK * MILLISECONDS_PER_SECOND;

      await this.cacheManager.setex(epochCapacityKey, epochDuration, newEpochCapacity.toString());
    } catch (error) {
      this.logger.error(`Error setting epoch capacity: ${error}`);

      throw error;
    }
  }
}
