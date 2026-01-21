import { ReadOnlyGuard } from '#account-api/guards/read-only.guard';
import { DelegationService } from '#account-api/services/delegation.service';
import {
  DelegationRequestDto,
  DelegationResponse,
  ProviderDelegationRequestDto,
  RevokeDelegationPayloadRequestDto,
  RevokeDelegationPayloadResponseDto,
  TransactionResponse,
} from '#types/dtos/account';
import { IDelegationResponse } from '#types/interfaces/account/delegations.interface';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AccountIdDto, ProviderMsaIdDto } from '#types/dtos/common';

@Controller({ version: '3', path: 'delegations' })
@ApiTags('v3/delegations')
@UseGuards(ReadOnlyGuard) // Apply guard at the controller level
export class DelegationsControllerV3 {
  constructor(
    private delegationService: DelegationService,
    @InjectPinoLogger(DelegationsControllerV3.name) private readonly logger: PinoLogger,
  ) {}

  // eslint-disable-next-line class-methods-use-this
  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all delegation information associated with an MSA Id' })
  @ApiOkResponse({ description: 'Found delegation information', type: DelegationResponse })
  async getDelegation(@Param() { msaId }: DelegationRequestDto): Promise<IDelegationResponse> {
    return this.delegationService.getDelegationV3(msaId);
  }

  // eslint-disable-next-line class-methods-use-this
  @Get(':msaId/:providerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get an MSA's delegation information for a specific provider" })
  @ApiOkResponse({ description: 'Found delegation information', type: DelegationResponse })
  async getProviderDelegation(@Param() { msaId, providerId }: ProviderDelegationRequestDto) {
    return this.delegationService.getDelegationV3(msaId, providerId);
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
    @Param() { accountId }: AccountIdDto,
    @Param() { providerId }: ProviderMsaIdDto,
  ): Promise<RevokeDelegationPayloadResponseDto> {
    this.logger.trace(`Getting RevokeDelegationPayload for account ${accountId} and provider ${providerId}`);
    return this.delegationService.getRevokeDelegationPayload(accountId, providerId);
  }

  @Post('revokeDelegation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to revoke a delegation' })
  @ApiCreatedResponse({ description: 'Created and queued request to revoke a delegation', type: TransactionResponse })
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
    this.logger.trace(revokeDelegationRequest, 'Posting RevokeDelegationPayloadRequest');
    return this.delegationService.postRevokeDelegation(revokeDelegationRequest);
  }
}
