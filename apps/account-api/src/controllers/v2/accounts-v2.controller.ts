import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { SiwfV2Service } from '#account-api/services/siwfV2.service';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { SCHEMA_NAME_TO_ID } from '#types/constants/schemas';
import { WalletV2LoginRequestDto } from '#types/dtos/account/wallet.v2.login.request.dto';
import { WalletV2LoginResponseDto } from '#types/dtos/account/wallet.v2.login.response.dto';
import { WalletV2RedirectRequestDto } from '#types/dtos/account/wallet.v2.redirect.request.dto';
import { WalletV2RedirectResponseDto } from '#types/dtos/account/wallet.v2.redirect.response.dto';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Query,
  Get,
  Post,
  Body,
  ForbiddenException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { hasChainSubmissions, isPayloadClaimHandle } from '@projectlibertylabs/siwf';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

// # SIWF Wallet API V2
// Goal: Generic Interface that supports FA and dApp 3rd-party wallets
//
// ## Request GET <URL>/start
//
// ### Parameters
// - `signedRequest`: SIWF Signed Request Payload
//   - Provider Signed
//     - `callback`
//     - `permissions` Schema Id Array
//   - Open
//     - Credential Request(s)
// - `frequencyRpcUrl`: A public node used by SIWF dApps for sign-in
// - Other query parameters will be echoed back to the Callback URL
//
// ## Callback GET <signedRequest.payload.callback>/api/payload
//
// The final retrieved payload will match the SIWF Response data structure.
//
// ### Authorization Code -> Frequency Access
//
// If the callback url contains an `authorizationCode` that can be exchanged for the payload from Frequency Access.
//
// - `authorizationCode`
//
// ### Payload Version
//
// - `authorizationPayload`: A base64url encoded, JSON stringification of the SIWF Response data structure.
//

@Controller({ version: '2', path: 'accounts' })
@ApiTags('v2/accounts')
export class AccountsControllerV2 {
  constructor(
    private siwfV2Service: SiwfV2Service,
    private blockchainService: BlockchainRpcQueryService,
    @Inject(blockchainConfig.KEY) private chainConfig: IBlockchainConfig,
    @Inject(apiConfig.KEY) private accountConfig: IAccountApiConfig,
    @InjectPinoLogger(AccountsControllerV2.name) private readonly logger: PinoLogger,
  ) {}

  // Should be an @Query when that is widely supported
  @Get('siwf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the Sign In With Frequency Redirect URL' })
  @ApiOkResponse({ description: 'SIWF Redirect URL', type: WalletV2RedirectResponseDto })
  async getRedirectUrl(@Query() query: WalletV2RedirectRequestDto): Promise<WalletV2RedirectResponseDto> {
    this.logger.debug('Received request for Sign In With Frequency v2 Redirect URL', JSON.stringify(query));

    const { callbackUrl } = query;
    const permissions = (query.permissions || []).map((p) => SCHEMA_NAME_TO_ID.get(p));
    const credentials = query.credentials || [];

    return this.siwfV2Service.getRedirectUrl(callbackUrl, permissions, credentials);
  }

  // This posts a payload containing either a SIWF payload, or an authentication code that can be used to retrieve a SIWF payload from the registered SIWF provider. The SIWF payload may be either:
  // - A signed SIWF login payload, which serves as the user's authentication
  // - One or more signed payloads for submission to the chain (ie, claim handle, account delegation, recovery key)
  @Post('siwf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process the result of a Sign In With Frequency v2 callback' })
  @ApiOkResponse({ description: 'Signed in successfully', type: WalletV2LoginResponseDto })
  async postSignInWithFrequency(@Body() callbackRequest: WalletV2LoginRequestDto): Promise<WalletV2LoginResponseDto> {
    this.logger.debug('Received Sign In With Frequency v2 callback', JSON.stringify(callbackRequest));

    if (!this.accountConfig.siwfV2URIValidation || !this.accountConfig.siwfV2URIValidation.length) {
      this.logger.error('"SIWF_V2_URI_VALIDATION" required to use SIWF v2');
      throw new ForbiddenException('SIWF v2 processing unavailable');
    }

    // Extract a valid payload from the request
    // This inludes the validation of the login payload if any
    // Also makes sure it is either a login or a delegation
    const payload = await this.siwfV2Service.getPayload(callbackRequest);

    // Validate claim handle transactions to prevent invalid submissions to the blockchain
    const handleResults = await Promise.all(
      payload.payloads
        .filter((transaction) => isPayloadClaimHandle(transaction))
        .map(async (claimHandle) => {
          const isValidHandle = await this.blockchainService.isValidHandle(claimHandle.payload.baseHandle);
          if (isValidHandle.isFalse) {
            throw new BadRequestException('Invalid base handle');
          }
        }),
    );
    if (handleResults.length) {
      this.logger.debug(`Validated handles (${payload.userPublicKey.encodedValue})`);
    }

    if (hasChainSubmissions(payload) && this.chainConfig.isDeployedReadOnly) {
      throw new ForbiddenException('New account sign-up unavailable in read-only mode');
    }

    // Trigger chain submissions, if any
    const jobStatus = await this.siwfV2Service.queueChainActions(payload, callbackRequest);

    const response = await this.siwfV2Service.getSiwfV2LoginResponse(payload);
    if (jobStatus) {
      response.signUpReferenceId = jobStatus.referenceId;
      response.signUpStatus = jobStatus.state;
    }

    return response;
  }
}
