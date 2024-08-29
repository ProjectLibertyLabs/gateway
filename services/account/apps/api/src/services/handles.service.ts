import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { HandleResponseDto } from '#lib/types/dtos/accounts.response.dto';
import { HandleRequestDto } from '#lib/types/dtos';
import { CommonPrimitivesHandlesClaimHandlePayload } from '@polkadot/types/lookup';

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
    return lastFinalizedBlockNumber + 10;
  }

  encodePayload(payload: HandleRequestDto['payload']): CommonPrimitivesHandlesClaimHandlePayload {
    return this.blockchainService.createClaimHandPayloadType(payload.baseHandle, payload.expiration);
  }
}
