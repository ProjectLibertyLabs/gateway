import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { TransactionType } from '#types/account-webhook';
import {
  RevokeDelegationPayloadResponseDto,
  RevokeDelegationPayloadRequestDto,
  TransactionResponse,
  PublishRevokeDelegationRequestDto,
} from '#types/dtos/account';
import { DelegationResponse, DelegationResponseV2 } from '#types/dtos/account/delegation.response.dto';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import blockchainConfig, { IBlockchainConfig } from '#account-lib/blockchain/blockchain.config';

@Injectable()
export class DelegationService {
  private readonly logger: Logger;

  constructor(
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainService,
    private enqueueService: EnqueueService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async getDelegation(msaId: string): Promise<DelegationResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const { providerId } = this.blockchainConf;

      const commonPrimitivesMsaDelegation = await this.blockchainService.getCommonPrimitivesMsaDelegation(
        msaId,
        providerId,
      );

      if (commonPrimitivesMsaDelegation) {
        const delegationResponse: DelegationResponse = {
          providerId: providerId.toString(),
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
    accountId: string,
    providerMsaId: string,
  ): Promise<RevokeDelegationPayloadResponseDto> {
    const msaId = await this.blockchainService.publicKeyToMsaId(accountId);
    if (!msaId) {
      throw new HttpException('MSA ID for account not found', HttpStatus.NOT_FOUND);
    }

    if (providerMsaId) {
      const isValidProviderId = await this.blockchainService.isValidMsaId(providerMsaId);
      if (!isValidProviderId) {
        throw new HttpException('Invalid provider', HttpStatus.BAD_REQUEST);
      }

      const providerInfo = await this.blockchainService.getProviderToRegistryEntry(providerMsaId);
      if (!providerInfo) {
        throw new HttpException('Supplied ID not a Provider', HttpStatus.BAD_REQUEST);
      }
    }

    // Validate that delegations exist for this msaId
    const delegations = await this.blockchainService.getProviderDelegationForMsa(msaId, providerMsaId);
    if (!delegations) {
      throw new HttpException('No delegations found', HttpStatus.NOT_FOUND);
    }
    if (delegations.revokedAtBlock !== 0) {
      throw new HttpException('Delegation already revoked', HttpStatus.NOT_FOUND);
    }
    return this.blockchainService.createRevokedDelegationPayload(accountId, providerMsaId);
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

  async getDelegationV2(msaId: string, providerId?: string): Promise<DelegationResponseV2> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (!isValidMsaId) {
      throw new HttpException('Invalid MSA', HttpStatus.NOT_FOUND);
    }

    if (providerId) {
      const isValidProviderId = await this.blockchainService.isValidMsaId(providerId);
      if (!isValidProviderId) {
        throw new HttpException('Invalid provider', HttpStatus.NOT_FOUND);
      }

      const providerInfo = await this.blockchainService.api.query.msa.providerToRegistryEntry(providerId);
      if (providerInfo.isNone) {
        throw new HttpException('Supplied ID not a Provider', HttpStatus.BAD_REQUEST);
      }

      const delegation = await this.blockchainService.getProviderDelegationForMsa(msaId, providerId);
      if (!delegation) {
        throw new HttpException('No delegations found', HttpStatus.NOT_FOUND);
      }

      return {
        msaId,
        delegations: [delegation],
      };
    }

    return {
      msaId,
      delegations: await this.blockchainService.getDelegationsForMsa(msaId),
    };
  }
}
