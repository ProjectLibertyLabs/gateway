import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueConstants } from '../../../../libs/common/src';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { DelegationResponse } from '../../../../libs/common/src/dtos/delegation.dto';

@Injectable()
export class DelegationService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async getDelegation(msaId: number): Promise<DelegationResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const commonPrimitivesMsaDelegation = await this.blockchainService.getCommonPrimitivesMsaDelegation(msaId);
      
      const providerId = this.configService.getProviderId();
      return { msaId: msaId, handle };
    }
    throw new Error('Invalid msaId.');
  }
}
