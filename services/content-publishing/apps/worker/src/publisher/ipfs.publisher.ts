import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KeyringPair } from '@polkadot/keyring/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '../../../api/src/config/config.service';
import { IPublisherJob } from '../interfaces/publisher-job.interface';
import { createKeys } from '../blockchain/create-keys';

@Injectable()
export class IPFSPublisher {
  private logger: Logger;

  constructor(private configService: ConfigService, private blockchainService: BlockchainService, private eventEmitter: EventEmitter2) {
    this.logger = new Logger(IPFSPublisher.name);
  }

  public async publish(messages: IPublisherJob[]): Promise<{ [key: string]: bigint }> {
    const providerKeys = createKeys(this.configService.getProviderAccountSeedPhrase());

    let batch: SubmittableExtrinsic<'rxjs', ISubmittableResult>[] = [];
    const batches: SubmittableExtrinsic<'rxjs', ISubmittableResult>[][] = [];
    const allowedBatchLen = await this.blockchainService.capacityBatchLimit();
    messages.forEach((message) => {
      batch.push(this.blockchainService.createExtrinsicCall({ pallet: 'messages', extrinsic: 'addIpfsMessage' }, message.schemaId, message.data.cid, message.data.payloadLength));

      if (batch.length === allowedBatchLen) {
        batches.push(batch);
        batch = [];
      }
    });

    if (batch.length > 0) {
      batches.push(batch);
    }
    return this.sendAndProcessChainEvents(providerKeys, batches);
  }

  async sendAndProcessChainEvents(providerKeys: KeyringPair, batchesMap: SubmittableExtrinsic<'rxjs', ISubmittableResult>[][]): Promise<{ [key: string]: bigint }> {
    try {
      // iterate over batches and send them to the chain returning the capacity withdrawn
      const batchPromises: Promise<{ [key: string]: bigint }>[] = [];

      batchesMap.forEach(async (batch) => {
        batchPromises.push(this.processSingleBatch(providerKeys, batch));
      });

      const totalCapUsedPerEpoch = await Promise.all(batchPromises);
      const totalCapacityUsed = totalCapUsedPerEpoch.reduce((acc, curr) => {
        const epoch = Object.keys(curr)[0];
        if (acc[epoch]) {
          acc[epoch] += curr[epoch];
        }
        acc[epoch] = curr[epoch];
        return acc;
      }, {} as { [key: string]: bigint });

      this.logger.debug(`Total capacity used: ${JSON.stringify(totalCapacityUsed)}`);
      return totalCapacityUsed;
    } catch (e) {
      this.logger.error(`Error processing batches: ${e}`);
      throw e;
    }
  }

  async processSingleBatch(providerKeys: KeyringPair, batch: SubmittableExtrinsic<'rxjs', ISubmittableResult>[]): Promise<{ [key: string]: bigint }> {
    this.logger.debug(`Submitting batch of size ${batch.length}`);
    try {
      const currrentEpoch = await this.blockchainService.getCurrentCapacityEpoch();
      const [event, eventMap] = await this.blockchainService
        .createExtrinsic({ pallet: 'frequencyTxPayment', extrinsic: 'payWithCapacityBatchAll' }, { eventPallet: 'utility', event: 'BatchCompleted' }, providerKeys, batch)
        .signAndSend();
      if (!event || !this.blockchainService.api.events.utility.BatchCompleted.is(event)) {
        // if we dont get any events, covering any unexpected connection errors
        throw new Error(`No events were found for batch`);
      }
      const capacityWithDrawn = BigInt(eventMap['capacity.CapacityWithdrawn'].data[1].toString());
      this.logger.debug(`Batch processed, capacity withdrawn: ${capacityWithDrawn}`);
      return { [currrentEpoch.toString()]: capacityWithDrawn };
    } catch (e) {
      this.logger.error(`Error processing batch: ${e}`);
      throw e;
    }
  }
}
