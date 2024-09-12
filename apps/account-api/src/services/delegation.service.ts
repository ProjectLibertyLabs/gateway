import { BlockchainConstants } from '#account-lib/blockchain/blockchain-constants';
import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { ConfigService } from '#account-lib/config/config.service';
import { DelegationResponse } from '#account-lib/types/dtos/delegation.response.dto';
import { RevokeDelegationPayloadResponseDto } from '#account-lib/types/dtos/revokeDelegation.request.dto';
import { Injectable, Logger } from '@nestjs/common';
import { HexString } from '@polkadot/util/types';
// import { EnqueueService, SECONDS_PER_BLOCK, TransactionType } from '#account-libs/common/src';

@Injectable()
export class DelegationService {
  private readonly logger: Logger;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    // REMOVE: is this causing the redis dependency?
    // Seems like it is, but why is that a problem?
    // Doesn't enqueue service work elsewhere in the api app?
    // private enqueueService: EnqueueService,
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

  async getExpiration(): Promise<number> {
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
    // standard expiration in SIWF is 10 minutes
    return lastFinalizedBlockNumber + BlockchainConstants.BLOCK_EXPIRATION_SECS / BlockchainConstants.SECONDS_PER_BLOCK;
  }

  // encodePayload(payload: RevokeDelegationPayloadRequest['payload']) {
  //   return this.blockchainService.createType('Compact<u64>', {
  //     providerMsaId: payload.providerId,
  //   });
  // }

  async getRevokeDelegationPayload(accountId: string, providerId: string): Promise<RevokeDelegationPayloadResponseDto> {
    const { signerPayload, encodedPayload } = await this.blockchainService.createRevokedDelegationPayload(
      accountId,
      providerId,
    );
    const revokeDelegationPayloadResponseDto: RevokeDelegationPayloadResponseDto = {
      accountId,
      providerId,
      extSignerPayloadRaw: {
        address: signerPayload.address,
        data: signerPayload.data,
        type: signerPayload.type,
      },
      encodedPayload: encodedPayload as HexString,
    };
    return revokeDelegationPayloadResponseDto;
  }

  // async retireMsa(retireMsaRequest: RetireMsaRequestDto): Promise<TransactionResponse> {
  //   try {
  //     const referenceId = await this.enqueueService.enqueueRequest<PublishRetireMsaRequestDto>({
  //       ...retireMsaRequest,
  //       type: TransactionType.RETIRE_MSA,
  //     });
  //     return referenceId;
  //   } catch (e: any) {
  //     this.logger.error(`Failed to enqueue retire msa request: ${e.toString()}`);
  //     throw new Error('Failed to enqueue retire msa request');
  //   }
  // }
  // async postRevokeDelegation(@Body() revokeDelegationRequest: RevokeDelegationRequestDto): Promise<TransactionResponse> {
  //   try {
  //     const response = await this.enqueueService.enqueueRequest<RevokeDelegationRequest>({
  //       ...revokeDelegationRequest
  //       type: TransactionType.REVOKE_DELEGATION,
  //     })
  //   }
  // }
}
