import { Controller, Get, HttpCode, HttpException, HttpStatus, Logger, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DelegationService } from '../services/delegation.service';
import { DelegationResponse } from '../../../../libs/common/src/types/dtos/delegation.dto';

@Controller('delegation')
@ApiTags('delegation')
export class DelegationController {
  private readonly logger: Logger;

  constructor(private delegationService: DelegationService) {
    this.logger = new Logger(this.constructor.name);
  }

  // Delegation endpoint
  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the delegation information associated with an msaId.' })
  @ApiOkResponse({ description: 'Found delegation information.' })
  async getDelegation(@Param('msaId') msaId: number): Promise<DelegationResponse> {
    try {
      const delegation = await this.delegationService.getDelegation(msaId);
      return delegation;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the delegation', HttpStatus.BAD_REQUEST);
    }
  }
}
