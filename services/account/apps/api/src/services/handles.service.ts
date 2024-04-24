import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { createHash } from 'crypto';
import { QueueConstants } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { PublishHandleRequest } from '../../../../libs/common/src/types/dtos/handles.dto';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { TransactionData, TransactionResponse } from '../../../../libs/common/src/types/dtos/transaction.dto';

@Injectable()
export class HandlesService {
  private readonly logger: Logger;

  constructor(private blockchainService: BlockchainService) {
    this.logger = new Logger(this.constructor.name);
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
