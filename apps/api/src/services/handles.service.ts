import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { AccountChangeRepsonseDto, QueueConstants } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { HandlesRequest, HandlesResponse } from '../../../../libs/common/src/dtos/handles.dtos';
import { Queue } from 'bullmq';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import type { HandleResponse, MessageSourceId } from '@frequency-chain/api-augment/interfaces';
import { createHash } from 'crypto';
import { AccountChangeType } from '../../../../libs/common/src/dtos/account.change.notification.dto';

@Injectable()
export class HandlesService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.ACCOUNT_CHANGE_PUBLISH_QUEUE)
    private accountChangePublishQueue: Queue,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  private calculateJobId(jobWithoutId): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  async enqueueRequest(
    request: HandlesRequest,
    type: AccountChangeType,
  ): Promise<AccountChangeRepsonseDto> {
    const providerId = this.configService.getProviderId();
    const data = {
      ...request,
      type,
      providerId,
      referenceId: this.calculateJobId(request),
    };

    const job = await this.accountChangePublishQueue.add(
      `Transaction Job - ${data.referenceId}`,
      data,
      { jobId: data.referenceId },
    );
    this.logger.log('Job enqueued: ', JSON.stringify(job));
    return {
      referenceId: data.referenceId,
    };
  }

  async getHandle(msaId: number): Promise<HandlesResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const handle = await this.blockchainService.getHandleForMsa(msaId);
      if (handle) {
        return { msaId, handle };
      } else {
        throw new Error('Handle not found.');
      }
    } else throw new Error('Invalid msaId.');
  }
}
