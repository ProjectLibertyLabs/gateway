import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { KeysResponse } from '#lib/types/dtos/keys.response.dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KeysService {
  private readonly logger: Logger;

  constructor(private blockchainService: BlockchainService) {
    this.logger = new Logger(this.constructor.name);
  }

  async getKeysByMsa(msaId: string): Promise<KeysResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const keyInfoResponse = await this.blockchainService.getKeysByMsa(msaId);
      this.logger.debug('Successfully found keys.');
      return { msaKeys: keyInfoResponse.msa_keys };
    }
    this.logger.error('Invalid msaId.');
    throw new Error('Invalid msaId.');
  }
}
