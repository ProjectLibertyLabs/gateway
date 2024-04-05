import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { QueueConstants } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { HandlesRequest, HandlesResponse } from '../../../../libs/common/src/dtos/handles.dtos';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';

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

  async createHandle(createHandleRequest: HandlesRequest): Promise<string | undefined> {
    const job = await this.accountChangePublishQueue.add('Create Handle', createHandleRequest);
    this.logger.debug(JSON.stringify(job));
    return job.id;
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
