import { Injectable } from '@nestjs/common';
import { ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { BlockchainService } from '#blockchain/blockchain.service';
import { IPublisherJob, isIpfsJob } from '#types/interfaces/content-publishing';
import { NonceConflictError } from '#blockchain/types';
import { DelayedError } from 'bullmq';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class MessagePublisher {
  constructor(
    private blockchainService: BlockchainService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
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
    try {
      return this.blockchainService.payWithCapacity(tx);
    } catch (e) {
      this.logger.error(`Error processing batch: ${e}`);
      if (e instanceof NonceConflictError) {
        throw new DelayedError();
      }
      throw e;
    }
  }
}
