import { Injectable, Logger } from '@nestjs/common';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';

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
