import { Injectable, Logger } from '@nestjs/common';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { BlockchainService } from '#lib/blockchain/blockchain.service';

@Injectable()
export class HandlesService {
  private readonly logger: Logger;

  constructor(private blockchainService: BlockchainService) {
    this.logger = new Logger(this.constructor.name);
  }

  async getHandle(msaId: string): Promise<HandleResponse | null> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      return this.blockchainService.getHandleForMsa(msaId);
    }
    throw new Error('Invalid msaId.');
  }
}
