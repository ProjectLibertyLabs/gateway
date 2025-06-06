import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { TransactionType } from '#types/account-webhook';
import {
  RevokeDelegationPayloadResponseDto,
  RevokeDelegationPayloadRequestDto,
  TransactionResponse,
  PublishRevokeDelegationRequestDto,
} from '#types/dtos/account';
import { DelegationResponse, DelegationResponseV2 } from '#types/dtos/account/delegation.response.dto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { pino, Logger } from 'pino';
import { getBasicPinoOptions } from '../../../../libs/logger/logLevel-common-config';

@Injectable()
export class DelegationService {
  private readonly logger: Logger;

  constructor(
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainRpcQueryService,
    private enqueueService: EnqueueService,
  ) {
    this.logger = pino(getBasicPinoOptions(DelegationService.name));
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
        return {
          providerId: providerId.toString(),
          schemaPermissions: commonPrimitivesMsaDelegation.schemaPermissions,
          revokedAt: commonPrimitivesMsaDelegation.revokedAt,
        };
      }
      throw new NotFoundException(`Failed to find the delegations for ${msaId} and ${providerId}`);
    }
    throw new NotFoundException(`Invalid msaId ${msaId}`);
  }

  async getRevokeDelegationPayload(
    accountId: string,
    providerMsaId: string,
  ): Promise<RevokeDelegationPayloadResponseDto> {
    const msaId = await this.blockchainService.publicKeyToMsaId(accountId);
    if (!msaId) {
      throw new NotFoundException(`MSA ID for account ${accountId} not found`);
    }

    if (providerMsaId) {
      const isValidProviderId = await this.blockchainService.isValidMsaId(providerMsaId);
      if (!isValidProviderId) {
        throw new NotFoundException(`Invalid msaId ${providerMsaId}`);
      }

      const providerInfo = await this.blockchainService.getProviderToRegistryEntry(providerMsaId);
      if (!providerInfo) {
        throw new BadRequestException(`Supplied ID not a Provider ${providerMsaId}`);
      }
    }

    // Validate that delegations exist for this msaId
    const delegations = await this.blockchainService.getProviderDelegationForMsa(msaId, providerMsaId);
    if (!delegations) {
      throw new NotFoundException(`No delegations found for ${msaId} and ${providerMsaId}`);
    }
    if (delegations.revokedAtBlock !== 0) {
      throw new BadRequestException('Delegation already revoked');
    }
    return this.blockchainService.createRevokedDelegationPayload(accountId, providerMsaId);
  }

  async postRevokeDelegation(revokeDelegationRequest: RevokeDelegationPayloadRequestDto): Promise<TransactionResponse> {
    try {
      this.logger.trace(`Posting revoke delegation request for account ${revokeDelegationRequest.accountId}`);
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
      throw new NotFoundException(`Invalid MSA Id ${msaId}`);
    }

    if (providerId) {
      const isValidProviderId = await this.blockchainService.isValidMsaId(providerId);
      if (!isValidProviderId) {
        throw new NotFoundException(`Invalid MSA Id ${providerId}`);
      }

      const providerInfo = await this.blockchainService.getProviderToRegistryEntry(providerId);
      if (!providerInfo) {
        throw new BadRequestException(`Supplied ID not a Provider ${providerId}`);
      }

      const delegation = await this.blockchainService.getProviderDelegationForMsa(msaId, providerId);
      if (!delegation) {
        throw new NotFoundException(`No delegations found for ${msaId} and ${providerId}`);
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
