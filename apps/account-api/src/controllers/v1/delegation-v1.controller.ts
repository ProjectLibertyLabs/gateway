import { ReadOnlyGuard } from '#account-api/guards/read-only.guard';
import { DelegationService } from '#account-api/services/delegation.service';
import {
  RevokeDelegationPayloadResponseDto,
  TransactionResponse,
  RevokeDelegationPayloadRequestDto,
} from '#types/dtos/account';
import { DelegationResponse } from '#types/dtos/account/delegation.response.dto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller({ version: '1', path: 'delegation' })
@ApiTags('delegation')
@UseGuards(ReadOnlyGuard) // Apply guard at the controller level
export class DelegationControllerV1 {
  private readonly logger: Logger;

  constructor(private delegationService: DelegationService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the delegation information associated with an MSA Id' })
  @ApiOkResponse({ description: 'Found delegation information', type: DelegationResponse })
  /**
   * Retrieves the delegation for a given MSA ID.
   *
   * @param msaId - The MSA ID for which to retrieve the delegation.
   * @returns A Promise that resolves to a DelegationResponse object representing the delegation.
   * @throws HttpException if the delegation cannot be found.
   */
  async getDelegation(@Param('msaId') msaId: string): Promise<DelegationResponse> {
    try {
      const delegation = await this.delegationService.getDelegation(msaId);
      return delegation;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the delegation', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('revokeDelegation/:accountId/:providerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a properly encoded RevokeDelegationPayload that can be signed' })
  @ApiOkResponse({
    description: 'Returned an encoded RevokeDelegationPayload for signing',
    type: RevokeDelegationPayloadResponseDto,
  })
  /**
   * Retrieves the revoke delegation payload for a given provider ID.
   * This encoded payload can be signed by the user to revoke the delegation to the given provider id.
   * The payload can be used to verify the encoded payload is correct before signing.
   * See the Frequency Rust Docs for more information:
   *   https://frequency-chain.github.io/frequency/pallet_msa/pallet/struct.Pallet.html#method.revoke_delegation_by_delegator
   *
   * @param providerId - The ID of the provider.
   * @returns A promise that resolves to a RevokeDelegationPayloadRequest object containing the payload and encoded payload.
   * @throws {HttpException} If there is an error generating the RevokeDelegationPayload.
   */
  async getRevokeDelegationPayload(
    @Param('accountId') accountId: string,
    @Param('providerId') providerId: string,
  ): Promise<RevokeDelegationPayloadResponseDto> {
    try {
      this.logger.verbose(`Getting RevokeDelegationPayload for account ${accountId} and provider ${providerId}`);
      return this.delegationService.getRevokeDelegationPayload(accountId, providerId);
    } catch (error) {
      this.logger.error('Error generating RevokeDelegationPayload', error);
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException('Failed to generate the RevokeDelegationPayload', HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Post('revokeDelegation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to revoke a delegation' })
  @ApiCreatedResponse({ description: 'Created and queued request to revoke a delegation', type: TransactionResponse })
  @ApiBody({ type: RevokeDelegationPayloadRequestDto })
  /**
   * Posts a request to revoke a delegation.
   *
   * @param revokeDelegationRequest - The payload request for revoking the delegation.
   * @returns A promise that resolves to a TransactionResponse.
   * @throws HttpException if the revocation fails.
   */
  async postRevokeDelegation(
    @Body()
    revokeDelegationRequest: RevokeDelegationPayloadRequestDto,
  ): Promise<TransactionResponse> {
    try {
      this.logger.verbose(revokeDelegationRequest, 'Posting RevokeDelegationPayloadRequest');
      return this.delegationService.postRevokeDelegation(revokeDelegationRequest);
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to revoke the delegation', HttpStatus.BAD_REQUEST);
    }
  }
}
