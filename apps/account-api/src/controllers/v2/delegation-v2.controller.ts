import { ReadOnlyGuard } from '#account-api/guards/read-only.guard';
import { DelegationService } from '#account-api/services/delegation.service';
import { DelegationRequestDto, DelegationResponseV2, ProviderDelegationRequestDto } from '#types/dtos/account';
import { IDelegationResponseV2 } from '#types/interfaces/account/delegations.interface';
import { Controller, Get, HttpCode, HttpStatus, Logger, Param, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller({ version: '2', path: 'delegations' })
@ApiTags('v2/delegations')
@UseGuards(ReadOnlyGuard) // Apply guard at the controller level
export class DelegationsControllerV2 {
  private readonly logger: Logger;

  constructor(private delegationService: DelegationService) {
    this.logger = new Logger(this.constructor.name);
  }

   
  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all delegation information associated with an MSA Id' })
  @ApiOkResponse({ description: 'Found delegation information', type: DelegationResponseV2 })
  async getDelegation(@Param() { msaId }: DelegationRequestDto): Promise<IDelegationResponseV2> {
    return this.delegationService.getDelegationV2(msaId);
  }

   
  @Get(':msaId/:providerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get an MSA's delegation information for a specific provider" })
  @ApiOkResponse({ description: 'Found delegation information', type: DelegationResponseV2 })
  async getProviderDelegation(@Param() { msaId, providerId }: ProviderDelegationRequestDto) {
    return this.delegationService.getDelegationV2(msaId, providerId);
  }
}
