import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { BlockchainService } from '#blockchain/blockchain.service';
import { IPublisherJob, isIpfsJob } from '#types/interfaces/content-publishing';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

@Injectable()
export class MessagePublisher implements OnApplicationBootstrap {
  private logger: Logger;

  private messageQueue: IPublisherJob[] = [];

  private maxBatchSize: number;

  // Tracks the current promise that's waiting to process a batch
  // Used to ensure concurrent publish calls join the same batch
  private batchingPromise: Promise<[SubmittableExtrinsic<'promise'>, string, number]> | null = null;

  // Reference to the current timeout that's waiting to process a batch
  // Used to clear the timeout if we need to process early
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(
    private blockchainRpcService: BlockchainRpcQueryService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = pino(getBasicPinoOptions(MessagePublisher.name));
  }

  async onApplicationBootstrap() {
    // Get the real batch size when the application starts
    this.maxBatchSize = await this.blockchainRpcService.maximumCapacityBatchLength();
  }

  public async publish(message: IPublisherJob): Promise<[SubmittableExtrinsic<'promise'>, string, number]> {
    // Add the new message to our queue
    this.messageQueue.push(message);

    // If we've hit our batch size limit, process immediately
    if (this.messageQueue.length >= this.maxBatchSize) {
      // Clear any existing timeout since we're processing now
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }
      return this.processBatch();
    }

    // If there's already a batch waiting to be processed,
    // return that promise so this message joins that batch
    if (this.batchingPromise) {
      return this.batchingPromise;
    }

    // Create a new promise that will process the batch after 6 seconds
    this.batchingPromise = new Promise((resolve, reject) => {
      this.batchTimeout = setTimeout(() => {
        // Only process if we have messages
        if (this.messageQueue.length > 0) {
          this.processBatch().then(resolve).catch(reject);
        }
      }, 6000); // Wait 6 seconds to collect more messages
    });

    return this.batchingPromise;
  }

  private async processBatch(): Promise<[SubmittableExtrinsic<'promise'>, string, number]> {
    // Safety check - shouldn't happen due to our logic above
    if (this.messageQueue.length === 0) {
      throw new Error('No messages in queue to process');
    }

    // Keep messages in queue until successful processing to enable recovery on error
    const batchToProcess = [...this.messageQueue];

    try {
      this.logger.debug(`Processing batch of ${batchToProcess.length} messages`);

      // Convert each message into a blockchain transaction
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

      // Create a vector of all transactions and submit as a single batch
      const callVec = this.blockchainService.createType('Vec<Call>', transactions);
      const result = await this.blockchainService.payWithCapacityBatchAll(callVec);

      // Only clear queue after successful processing
      this.messageQueue = this.messageQueue.slice(batchToProcess.length);
      this.batchingPromise = null;

      return result;
    } catch (e) {
      this.logger.error(`Error processing batch: ${e}`);

      // Reset batching promise to allow retry
      this.batchingPromise = null;

      // If we have a nonce conflict, throw a special error that will
      // cause the job to be retried later
      if (e instanceof NonceConflictError) {
        throw new DelayedError();
      }
      throw e;
    }
  }
}
