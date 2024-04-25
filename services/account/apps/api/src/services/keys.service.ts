import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { KeysResponse } from '../../../../libs/common/src/types/dtos/keys.response.dto';

@Injectable()
export class KeysService {
  private readonly logger: Logger;

  constructor(private blockchainService: BlockchainService) {
    this.logger = new Logger(this.constructor.name);
  }

  async getKeysByMsa(msaId: number): Promise<KeysResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const keyInfoResponse = await this.blockchainService.getKeysByMsa(msaId);
      this.logger.debug('Successfully found keys.');
      return keyInfoResponse.msa_keys;
    }
    this.logger.error('Invalid msaId.');
    throw new Error('Invalid msaId.');
  }
}
