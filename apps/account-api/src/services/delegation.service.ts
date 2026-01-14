import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { TransactionType } from '#types/account-webhook';
import {
  DelegationResponse,
  PublishRevokeDelegationRequestDto,
  RevokeDelegationPayloadRequestDto,
  RevokeDelegationPayloadResponseDto,
  TransactionResponse,
} from '#types/dtos/account';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { PinoLogger } from 'nestjs-pino';
import { CommonPrimitivesMsaDelegationResponse } from '@polkadot/types/lookup';
import { chainDelegationToNative, IDelegation } from '#types/interfaces/account';

@Injectable()
export class DelegationService {
  constructor(
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainRpcQueryService,
    private enqueueService: EnqueueService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
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
    const delegation = await this.blockchainService.getProviderDelegationForMsa(msaId, providerMsaId);
    if (!delegation) {
      throw new NotFoundException(`No delegations found for ${msaId} and ${providerMsaId}`);
    }
    if (delegation.revokedAtBlock !== 0) {
      throw new BadRequestException('Delegation already revoked');
    }
    return this.blockchainService.createRevokedDelegationPayload(accountId, providerMsaId);
  }

  async postRevokeDelegation(revokeDelegationRequest: RevokeDelegationPayloadRequestDto): Promise<TransactionResponse> {
    try {
      this.logger.trace(`Posting revoke delegation request for account ${revokeDelegationRequest.accountId}`);
      // noinspection UnnecessaryLocalVariableJS
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

  async getDelegationV3(msaId: string, providerId?: string): Promise<DelegationResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (!isValidMsaId) {
      throw new NotFoundException(`Invalid MSA Id ${msaId}`);
    }

    let delegations: IDelegation[];
    if (providerId) {
      const isValidProviderId = await this.blockchainService.isValidMsaId(providerId);
      if (!isValidProviderId) {
        throw new NotFoundException(`Invalid MSA Id for Provider ${providerId}`);
      }

      const providerInfo = await this.blockchainService.getProviderToRegistryEntry(providerId);
      if (!providerInfo) {
        throw new BadRequestException(`Supplied ID not a Provider ${providerId}`);
      }

      const delegation = await this.blockchainService.getProviderDelegationForMsa(msaId, providerId);
      if (!delegation) {
        throw new NotFoundException(`No delegations found for ${msaId} and ${providerId}`);
      }

      delegations = [delegation];
    } else {
      delegations = await this.blockchainService.getDelegationsForMsa(msaId);
    }

    return {
      msaId,
      delegations,
    };
  }
}
