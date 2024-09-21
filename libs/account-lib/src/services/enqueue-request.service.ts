/* eslint-disable class-methods-use-this */
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { TransactionResponse, TransactionData } from '#types/dtos/account';
import blockchainConfig, { IBlockchainConfig } from '#account-lib/blockchain/blockchain.config';

@Injectable()
export class EnqueueService {
  private readonly logger: Logger;

  constructor(
    @InjectQueue(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
    private transactionPublishQueue: Queue,
    @Inject(blockchainConfig.KEY) private config: IBlockchainConfig,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  private calculateJobId<RequestType>(jobWithoutId: RequestType): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  async enqueueRequest<RequestType>(request: RequestType): Promise<TransactionResponse> {
    const { providerId } = this.config;
    const data: TransactionData<RequestType> = {
      ...request,
      providerId: providerId.toString(),
      referenceId: this.calculateJobId(request),
    };

    // add() will not fail if Redis is down, it will keep waiting for a reconnection to occur
    // and then add the job to the queue.
    // Configuring enableOfflineQueue: false will not queue the job if the connection is lost.
    // The REST API will return a 500 error if the connection is lost.
    const job = await this.transactionPublishQueue.add(`Transaction Job - ${data.referenceId}`, data, {
      jobId: data.referenceId,
    });

    this.logger.log('Job enqueued: ', JSON.stringify(job));
    return {
      referenceId: data.referenceId,
    };
  }
}
