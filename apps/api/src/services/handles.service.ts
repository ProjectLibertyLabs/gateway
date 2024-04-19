import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { createHash } from 'crypto';
import { QueueConstants } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { PublishHandleRequest } from '../../../../libs/common/src/types/dtos/handles.dto';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { TransactionData, TransactionRepsonse } from '../../../../libs/common/src/types/dtos/transaction.dto';

@Injectable()
export class HandlesService {
  private readonly logger: Logger;

  constructor(
    @InjectQueue(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
    private transactionPublishQueue: Queue,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: PublishHandleRequest): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  async enqueueRequest(request: PublishHandleRequest): Promise<TransactionRepsonse> {
    const { providerId } = this.configService;
    const data: TransactionData<PublishHandleRequest> = {
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

  async getHandle(msaId: number): Promise<HandleResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const handle = await this.blockchainService.getHandleForMsa(msaId);
      if (handle) return handle;
      throw new Error('Handle not found.');
    }
    throw new Error('Invalid msaId.');
  }
}
