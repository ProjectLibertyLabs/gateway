import { Injectable } from '@nestjs/common';
import { ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { BlockchainService } from '#blockchain/blockchain.service';
import { IPublisherJob, isIpfsJob } from '#types/interfaces/content-publishing';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

@Injectable()
export class MessagePublisher {
  private logger: Logger;

  constructor(private blockchainService: BlockchainService) {
    this.logger = pino(getBasicPinoOptions(MessagePublisher.name));
  }

  public async publish(message: IPublisherJob): ReturnType<MessagePublisher['processSingleBatch']> {
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
  ): ReturnType<BlockchainService['payWithCapacity']> {
    this.logger.debug(`Submitting tx of size ${tx.length}`);
    return this.blockchainService.payWithCapacity(tx);
  }
}
