import { ReadOnlyGuard } from '#account-api/guards/read-only.guard';
import { DelegationService } from '#account-api/services/delegation.service';
import { DelegationResponse } from '#account-lib/types/dtos/delegation.response.dto';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Logger, Param, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {MsaIdParam} from "#account-lib/types/dtos/accounts.request.dto";

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
  async getDelegation(@Param() msaId: MsaIdParam): Promise<DelegationResponse> {
    try {
      const delegation = await this.delegationService.getDelegation(msaId.msaId);
      return delegation;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the delegation', HttpStatus.BAD_REQUEST);
    }
  }
}
