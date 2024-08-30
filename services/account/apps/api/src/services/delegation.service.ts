import { BLOCK_EXPIRATION_SECS, BlockchainService } from '#lib/blockchain/blockchain.service';
import { ConfigService } from '#lib/config/config.service';
import { DelegationResponse } from '#lib/types/dtos/delegation.response.dto';
import { RevokeDelegationRequest } from '#lib/types/dtos/revokeDelegation.request.dto';
import { Injectable, Logger } from '@nestjs/common';
import { SECONDS_PER_BLOCK } from 'libs/common/src';

@Injectable()
export class DelegationService {
  private readonly logger: Logger;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async getDelegation(msaId: string): Promise<DelegationResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const { providerId } = this.configService;

      const commonPrimitivesMsaDelegation = await this.blockchainService.getCommonPrimitivesMsaDelegation(
        msaId,
        providerId,
      );

      if (commonPrimitivesMsaDelegation) {
        const delegationResponse: DelegationResponse = {
          providerId,
          schemaPermissions: commonPrimitivesMsaDelegation.schemaPermissions,
          revokedAt: commonPrimitivesMsaDelegation.revokedAt,
        };
        return delegationResponse;
      }
      throw new Error('Failed to find the delegation.');
    }
    throw new Error('Invalid msaId.');
  }

  async getRevokeDelegationPayload(
    providerId: string,
    expirationTime: number = BLOCK_EXPIRATION_SECS,
  ): Promise<RevokeDelegationRequest> {
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
    const expirationBlockNumber = lastFinalizedBlockNumber + expirationTime / SECONDS_PER_BLOCK;
    const revokeDelegationType = this.blockchainService.createType('RevokeDelegationPayload', {
      providerId,
      expirationBlockNumber,
    });
    // return this.blockchainService.getRevokeDelegationPayload(providerId);
  }
}
