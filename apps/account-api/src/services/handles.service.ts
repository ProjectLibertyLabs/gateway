import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { HandleResponseDto } from '#account-lib/types/dtos/accounts.response.dto';
import { BlockchainConstants } from '#account-lib/blockchain/blockchain-constants';
import { HandleRequestDto } from '#account-lib/types/dtos';

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

  async getExpiration(): Promise<number> {
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
    // standard expiration in SIWF is 10 minutes
    return lastFinalizedBlockNumber + 600 / BlockchainConstants.SECONDS_PER_BLOCK;
  }

  encodePayload(payload: HandleRequestDto['payload']) {
    return this.blockchainService.createClaimHandPayloadType(payload.baseHandle, payload.expiration);
  }
}
