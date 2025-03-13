import { Injectable, Logger } from '@nestjs/common';
import { ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { BlockchainService } from '#blockchain/blockchain.service';
import { HexString } from '@polkadot/util/types';
import { IPublisherJob, isIpfsJob } from '#types/interfaces/content-publishing';

@Injectable()
export class MessagePublisher {
  private logger: Logger;

  constructor(private blockchainService: BlockchainService) {
    this.logger = new Logger(MessagePublisher.name);
  }

  public async publish(
    message: IPublisherJob,
  ): Promise<[SubmittableExtrinsic<'promise', ISubmittableResult>, HexString]> {
    const tx = isIpfsJob(message)
      ? this.blockchainService.generateAddIpfsMessage(message.schemaId, message.data.cid, message.data.payloadLength)
      : this.blockchainService.generateAddOnchainMessage(
          message.schemaId,
          message.data.payload,
          message.data.onBehalfOf,
        );
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
