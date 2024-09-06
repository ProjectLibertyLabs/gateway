import { ReadOnlyGuard } from '#api/guards/read-only.guard';
import { DelegationService } from '#api/services/delegation.service';
import { DelegationResponse } from '#lib/types/dtos/delegation.response.dto';
import { RevokeDelegationPayloadRequest } from '#lib/types/dtos/revokeDelegation.request.dto';
import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';

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
  ): Promise<RevokeDelegationPayloadRequest> {
    try {
      const expiration = await this.delegationService.getExpiration();
      const payload = { providerId, expiration };
      const encodedPayload = u8aToHex(u8aWrapBytes(this.delegationService.encodePayload(payload).toU8a()));
      const revokeDelegationPayload: RevokeDelegationPayloadRequest = { payload, encodedPayload };
      this.logger.warn(`REMOVE:RevokeDelegationPayload: ${revokeDelegationPayload}`);
      return revokeDelegationPayload;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to generate the RevokeDelegationPayload', HttpStatus.BAD_REQUEST);
    }
  }

  // Pass through the revoke delegation request to the blockchain
  @Post('revokeDelegation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a delegation' })
  @ApiOkResponse({ description: 'Successfully revoked the delegation' })
  async postRevokeDelegation(encodedPayload: RevokeDelegationPayloadRequest): Promise<void> {
    try {
      // TODO: Implement the postRevokeDelegation method in the DelegationService
      // await this.delegationService.postRevokeDelegation(encodedPayload);
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to revoke the delegation', HttpStatus.BAD_REQUEST);
    }
  }
}
