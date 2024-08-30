import { ReadOnlyGuard } from '#api/guards/read-only.guard';
import { DelegationService } from '#api/services/delegation.service';
import { DelegationResponse } from '#lib/types/dtos/delegation.response.dto';
import { RevokeDelegationRequest } from '#lib/types/dtos/revokeDelegation.request.dto';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Logger, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('v1/delegation')
@ApiTags('v1/delegation')
@UseGuards(ReadOnlyGuard) // Apply guard at the controller level
export class DelegationControllerV1 {
  private readonly logger: Logger;

  constructor(private delegationService: DelegationService) {
    this.logger = new Logger(this.constructor.name);
  }

  // Delegation endpoint
  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the delegation information associated with an MSA Id' })
  @ApiOkResponse({ description: 'Found delegation information' })
  async getDelegation(@Param('msaId') msaId: string): Promise<DelegationResponse> {
    try {
      const delegation = await this.delegationService.getDelegation(msaId);
      return delegation;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the delegation', HttpStatus.BAD_REQUEST);
    }
  }

  // Revoke Delegation endpoint
  @Get('revokeDelegation/:providerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a properly encoded RevokeDelegationPayload that can be signed' })
  @ApiOkResponse({ description: 'Returned an encoded RevokeDelegationPayload for signing' })
  async getRevokeDelegationPayload(
    @Param('providerId') providerId: string,
    @Query('expirationTime') expirationTime?: number,
  ): Promise<RevokeDelegationRequest> {
    try {
      const revokeDelegationPayload = this.delegationService.getRevokeDelegationPayload(providerId, expirationTime);
      return revokeDelegationPayload;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to generate the RevokeDelegationPayload', HttpStatus.BAD_REQUEST);
    }
  }
}
