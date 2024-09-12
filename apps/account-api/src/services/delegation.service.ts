import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { ConfigService } from '#account-lib/config/config.service';
import { DelegationResponse, DelegationResponseV2 } from '#types/dtos/account/delegation.response.dto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

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
