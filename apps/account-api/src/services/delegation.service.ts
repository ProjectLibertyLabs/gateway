import { BlockchainConstants } from '#account-lib/blockchain/blockchain-constants';
import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { ConfigService } from '#account-lib/config/config.service';
import { TransactionResponse } from '#account-lib/types/dtos';
import { DelegationResponse } from '#account-lib/types/dtos/delegation.response.dto';
import {
  PublishRevokeDelegationRequestDto,
  RevokeDelegationPayloadRequestDto,
  RevokeDelegationPayloadResponseDto,
} from '#account-lib/types/dtos/revokeDelegation.request.dto';
import { Injectable, Logger } from '@nestjs/common';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#account-lib';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';

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

  // async getExpiration(): Promise<number> {
  //   const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
  //   // standard expiration in SIWF is 10 minutes
  //   return lastFinalizedBlockNumber + BlockchainConstants.BLOCK_EXPIRATION_SECS / BlockchainConstants.SECONDS_PER_BLOCK;
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

  async postRevokeDelegation(revokeDelegationRequest: RevokeDelegationPayloadRequestDto): Promise<TransactionResponse> {
    try {
      this.logger.verbose(`Posting revoke delegation request for account ${revokeDelegationRequest.accountId}`);
      const referenceId = await this.enqueueService.enqueueRequest<PublishRevokeDelegationRequestDto>({
        ...revokeDelegationRequest,
        type: TransactionType.REVOKE_DELEGATION,
      });
      return referenceId;
    } catch (e: any) {
      this.logger.error(`Failed to enqueue revokeDelegation request: ${e.toString()}`);
      throw new Error('Failed to enqueue revokeDelegation request');
    }
  }
}
