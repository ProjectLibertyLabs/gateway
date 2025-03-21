import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { AccountQueues as QueueConstants } from '#types/constants/queue.constants';
import { TransactionResponse, TransactionData } from '#types/dtos/account';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';

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

  private static calculateJobId<RequestType>(jobWithoutId: RequestType): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  async enqueueRequest<RequestType extends Object>(request: RequestType): Promise<TransactionResponse> {
    const { providerId } = this.config;
    // Best-effort attempt at de-duping payloads that are submitted multiple times.
    // For payloads submitted via authorization code, we can de-dupe on that.
    // For paylaods submitted directly, we can de-dupe IFF the exact same payload
    // is submitted multiple times; however, it is possible that the same set of extrinsic
    // calls could be submitted multiple times, but with different signatures. In that case
    // the only way to de-dupe would be to decode the extrinsics in the payload and de-dupe
    // based on examination of the public key and other parameters of the extrinsics. While
    // technically possible, deemed overkill for now.
    const authorizationCode =
      'authorizationCode' in request && typeof request.authorizationCode === 'string'
        ? request.authorizationCode
        : undefined;
    const referenceId = authorizationCode || EnqueueService.calculateJobId(request);

    const data: TransactionData<RequestType> = {
      ...request,
      providerId: providerId.toString(),
      referenceId,
    };

    // add() will not fail if Redis is down, it will keep waiting for a reconnection to occur
    // and then add the job to the queue.
    // Configuring enableOfflineQueue: false will not queue the job if the connection is lost.
    // The REST API will return a 500 error if the connection is lost.
    //
    // Also: if this job already exists in the queue (whether waiting, completed, failed, etc),
    // then '.add()' will simply return the existing job, not add a new one.
    const job = await this.transactionPublishQueue.add(`Transaction Job - ${data.referenceId}`, data, {
      jobId: data.referenceId,
    });
    const jobState = await job.getState();

    this.logger.log('Job enqueued or retrieved: ', JSON.stringify(job));
    return {
      referenceId: data.referenceId,
      state: jobState,
    };
  }
}
