import { Injectable } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { BlockchainService } from '#blockchain/blockchain.service';
import { IPublisherJob, isIpfsJob } from '#types/interfaces/content-publishing';
import { NonceConflictError } from '#blockchain/types';
import { DelayedError } from 'bullmq';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';
import { Vec } from '@polkadot/types';
import { Call } from '@polkadot/types/interfaces';

@Injectable()
export class MessagePublisher {
  private logger: Logger;

  private messageQueue: IPublisherJob[] = [];

  private readonly BATCH_SIZE_LIMIT = 10;

  constructor(private blockchainService: BlockchainService) {
    this.logger = pino(getBasicPinoOptions(MessagePublisher.name));
  }

  public async publish(message: IPublisherJob): Promise<[SubmittableExtrinsic<'promise'>, string, number]> {
    this.messageQueue.push(message);

    if (this.messageQueue.length >= this.BATCH_SIZE_LIMIT) {
      return this.processBatch();
    }

    // If this is the first message in the queue, process it immediately
    if (this.messageQueue.length === 1) {
      return this.processBatch();
    }

    // Otherwise, wait for more messages to accumulate
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.messageQueue.length > 0) {
          this.processBatch().then(resolve);
        }
      }, 1000); // Wait 1 second for more messages
    });
  }

  private async processBatch(): Promise<[SubmittableExtrinsic<'promise'>, string, number]> {
    if (this.messageQueue.length === 0) {
      throw new Error('No messages in queue to process');
    }

    const batchToProcess = [...this.messageQueue];
    this.messageQueue = [];

    try {
      this.logger.debug(`Processing batch of ${batchToProcess.length} messages`);

      const transactions = batchToProcess.map((message) =>
        isIpfsJob(message)
          ? this.blockchainService.generateAddIpfsMessage(
              message.schemaId,
              message.data.cid,
              message.data.payloadLength,
            )
          : this.blockchainService.generateAddOnchainMessage(
              message.schemaId,
              message.data.payload,
              message.data.onBehalfOf,
            ),
      );

      const callVec = this.blockchainService.createType('Vec<Call>', transactions);
      return this.blockchainService.payWithCapacityBatchAll(callVec);
    } catch (e) {
      this.logger.error(`Error processing batch: ${e}`);
      if (e instanceof NonceConflictError) {
        throw new DelayedError();
      }
      throw e;
    }
  }
}
