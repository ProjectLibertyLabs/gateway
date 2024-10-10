import { Injectable, Logger } from '@nestjs/common';
import { ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { BlockchainService } from '#blockchain/blockchain.service';
import { IPublisherJob } from '../interfaces';
import { HexString } from '@polkadot/util/types';

@Injectable()
export class IPFSPublisher {
  private logger: Logger;

  constructor(private blockchainService: BlockchainService) {
    this.logger = new Logger(IPFSPublisher.name);
  }

  public async publish(
    message: IPublisherJob,
  ): Promise<[SubmittableExtrinsic<'promise', ISubmittableResult>, HexString]> {
    this.logger.debug(JSON.stringify(message));
    const tx = this.blockchainService.addIpfsMessage(message.schemaId, message.data.cid, message.data.payloadLength);
    return this.processSingleBatch(tx);
  }

  async processSingleBatch(
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  ): Promise<[SubmittableExtrinsic<'promise', ISubmittableResult>, HexString]> {
    this.logger.debug(`Submitting tx of size ${tx.length}`);
    try {
      return this.blockchainService.payWithCapacity(tx);
    } catch (e) {
      this.logger.error(`Error processing batch: ${e}`);
      throw e;
    }
  }
}
