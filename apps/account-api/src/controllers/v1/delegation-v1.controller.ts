import { ReadOnlyGuard } from '#account-api/guards/read-only.guard';
import { DelegationService } from '#account-api/services';
import { DelegationResponse } from '#account-lib/types/dtos/delegation.response.dto';
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
import { RevokeDelegationPayloadResponseDto } from 'libs/account-lib/src/types/dtos/revokeDelegation.request.dto';

@Controller('v1/delegation')
@ApiTags('v1/delegation')
@UseGuards(ReadOnlyGuard) // Apply guard at the controller level
export class DelegationControllerV1 {
  private readonly logger: Logger;

  constructor(private delegationService: DelegationService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the delegation information associated with an MSA Id' })
  @ApiOkResponse({ description: 'Found delegation information' })
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
  @ApiOkResponse({ description: 'Returned an encoded RevokeDelegationPayload for signing' })
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
      this.logger.error(error);
      throw new HttpException('Failed to generate the RevokeDelegationPayload', HttpStatus.BAD_REQUEST);
    }
  }

  // Pass through the revoke delegation request to the blockchain
  // @Post('revokeDelegation')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Revoke a delegation' })
  // @ApiOkResponse({ description: 'Successfully revoked the delegation' })
  // async postRevokeDelegation(encodedPayload: RevokeDelegationPayloadRequest): Promise<void> {
  //   try {
  //     // TODO: Implement the postRevokeDelegation method in the DelegationService
  //     // await this.delegationService.postRevokeDelegation(encodedPayload);
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw new HttpException('Failed to revoke the delegation', HttpStatus.BAD_REQUEST);
  //   }
  // }
}
