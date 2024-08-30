import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { HandleResponseDto } from '#lib/types/dtos/accounts.response.dto';

@Injectable()
export class HandlesService {
  private readonly logger: Logger;

  constructor(private blockchainService: BlockchainService) {
    this.logger = new Logger(this.constructor.name);
  }

  async getHandle(msaId: string): Promise<HandleResponseDto | null> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      return this.blockchainService.getHandleForMsa(msaId);
    }
    throw new Error('Invalid msaId.');
  }
}
