import { BlockchainConstants } from '#lib/blockchain/blockchain-constants';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { ConfigService } from '#lib/config/config.service';
import { TransactionResponse } from '#lib/types/dtos';
import { DelegationResponse } from '#lib/types/dtos/delegation.response.dto';
import {
  RevokeDelegationPayloadRequest,
  RevokeDelegationRequestDto,
} from '#lib/types/dtos/revokeDelegation.request.dto';
import { Injectable, Logger } from '@nestjs/common';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { EnqueueService, SECONDS_PER_BLOCK, TransactionType } from 'libs/common/src';

@Injectable()
export class DelegationService {
  private readonly logger: Logger;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private enqueueService: EnqueueService,
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

  // async getRevokeDelegationPayload(
  //   providerId: string,
  //   expirationTime: number = BLOCK_EXPIRATION_SECS,
  // ): Promise<RevokeDelegationPayloadRequest> {
  //   const revokeDelegationType = this.blockchainService.createType('RevokeDelegationPayload', {
  //     providerId,
  //     expiration: expirationBlockNumber,
  //   });
  //   const encodedPayload = u8aToHex(u8aWrapBytes(revokeDelegationType.toU8a()));
  //   this.logger.debug(`RevokeDelegationPayload: ${encodedPayload}`);

  //   const revokeDelegationRequest: RevokeDelegationPayloadRequest = {
  //     payload: revokeDelegationType,
  //     encodedPayload,
  //   };
  //   return revokeDelegationRequest;
  // }

  async getExpiration(): Promise<number> {
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
    // standard expiration in SIWF is 10 minutes
    return lastFinalizedBlockNumber + BlockchainConstants.BLOCK_EXPIRATION_SECS / BlockchainConstants.SECONDS_PER_BLOCK;
  }

  encodePayload(payload: RevokeDelegationPayloadRequest['payload']) {
    // return this.blockchainService.createClaimHandPayloadType(payload.providerId, payload.expiration);
    const revokeDelegationType = this.blockchainService.createType('RevokeDelegationPayload', {
      providerId: payload.providerId,
      expiration: payload.expiration,
    });
    this.logger.warn(`REMOVE:RevokeDelegationPayload: ${revokeDelegationType}`);
    return revokeDelegationType;
  }

  // async postRevokeDelegation(@Body() revokeDelegationRequest: RevokeDelegationRequestDto): Promise<TransactionResponse> {
  //   try {
  //     const response = await this.enqueueService.enqueueRequest<RevokeDelegationRequest>({
  //       ...revokeDelegationRequest
  //       type: TransactionType.REVOKE_DELEGATION,
  //     })
  //   }
  // }
}
