/* eslint-disable class-methods-use-this */
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { ConfigService } from '../config/config.service';
import { QueueConstants } from '../utils/queues';
import { TransactionData } from '../types/dtos/transaction.request.dto';
import { TransactionResponse } from '../types/dtos/transaction.response.dto';

@Injectable()
export class EnqueueService {
  private readonly logger: Logger;

  constructor(
    @InjectQueue(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
    private transactionPublishQueue: Queue,
    private configService: ConfigService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  private calculateJobId<RequestType>(jobWithoutId: RequestType): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  async enqueueRequest<RequestType>(request: RequestType): Promise<TransactionResponse> {
    const { providerId } = this.configService;
    const data: TransactionData<RequestType> = {
      ...request,
      providerId,
      referenceId: this.calculateJobId(request),
    };

    const job = await this.transactionPublishQueue.add(`Transaction Job - ${data.referenceId}`, data, {
      jobId: data.referenceId,
    });

    this.logger.log('Job enqueued: ', JSON.stringify(job));
    return {
      referenceId: data.referenceId,
    };
  }
}
