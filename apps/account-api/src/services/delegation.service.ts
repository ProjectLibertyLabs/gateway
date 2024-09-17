import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { ConfigService } from '#account-lib/config/config.service';
import { TransactionResponse } from '#account-lib/types/dtos';
import { TransactionResponse } from '#account-lib/types/dtos';
import { DelegationResponse } from '#account-lib/types/dtos/delegation.response.dto';
import {
  PublishRevokeDelegationRequestDto,
  RevokeDelegationPayloadRequestDto,
  RevokeDelegationPayloadResponseDto,
} from '#account-lib/types/dtos/revokeDelegation.request.dto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { TransactionType } from '#account-lib';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { isAddress } from '@polkadot/util-crypto';

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

  async getRevokeDelegationPayload(accountId: string, providerId: string): Promise<RevokeDelegationPayloadResponseDto> {
    if (!isAddress(accountId)) {
      throw new HttpException('Invalid accountId', HttpStatus.BAD_REQUEST);
    }
    const msaId = await this.blockchainService.publicKeyToMsaId(accountId);
    if (!msaId) {
      throw new HttpException('MSA ID for account not found', HttpStatus.NOT_FOUND);
    }

    // Validate that the providerId is a registered provider, also checks for valid MSA ID
    const providerRegistry = await this.blockchainService.getProviderToRegistryEntry(providerId);
    if (!providerRegistry) {
      throw new HttpException('Provider not found', HttpStatus.BAD_REQUEST);
    }

    // Validate that delegations exist for this msaId
    try {
      const delegations = await this.getDelegation(msaId);
      if (delegations.providerId !== providerId) {
        throw new HttpException('Delegation not found', HttpStatus.NOT_FOUND);
      }
    } catch (e: any) {
      this.logger.error(`Failed to get revoke delegation payload: ${e.toString()}`);
      throw new HttpException('Delegation not found', HttpStatus.NOT_FOUND);
    }
    return this.blockchainService.createRevokedDelegationPayload(accountId, providerId);
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
