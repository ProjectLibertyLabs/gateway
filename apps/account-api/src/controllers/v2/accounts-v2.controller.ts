import { SiwfV2Service } from '#account-api/services/siwfV2.service';
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
  Logger,
  Query,
  Get,
  Post,
  Body,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { hasChainSubmissions } from '@projectlibertylabs/siwfv2';

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

@Controller('v2/accounts')
@ApiTags('v2/accounts')
export class AccountsControllerV2 {
  private readonly logger: Logger;

  constructor(
    private siwfV2Service: SiwfV2Service,
    @Inject(blockchainConfig.KEY) private config: IBlockchainConfig,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  // Should be an @Query when that is widely supported
  @Get('siwf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the Sign In With Frequency Redirect URL' })
  @ApiOkResponse({ description: 'SIWF Redirect URL', type: WalletV2RedirectResponseDto })
  async getRedirectUrl(@Query() query: WalletV2RedirectRequestDto): Promise<WalletV2RedirectResponseDto> {
    this.logger.debug('Received request for Sign In With Frequency v2 Redirect URL', query);

    const { callbackUrl } = query;
    const permissions = (query.permissions || []).map((p) => SCHEMA_NAME_TO_ID.get(p));
    const credentials = query.credentials || [];

    return this.siwfV2Service.getRedirectUrl(callbackUrl, permissions, credentials);
  }

  @Post('siwf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process the result of a Sign In With Frequency v2 callback' })
  @ApiOkResponse({ description: 'Signed in successfully', type: WalletV2LoginResponseDto })
  async postSignInWithFrequency(@Body() callbackRequest: WalletV2LoginRequestDto): Promise<WalletV2LoginResponseDto> {
    this.logger.debug('Received Sign In With Frequency v2 callback', callbackRequest);

    // Extract a valid payload from the request
    // This inludes the validation of the login payload if any
    // Also makes sure it is either a login or a delegation
    const payload = await this.siwfV2Service.getPayload(callbackRequest);

    if (hasChainSubmissions(payload) && this.config.isDeployedReadOnly) {
      throw new ForbiddenException('New account sign-up unavailable in read-only mode');
    }

    // Trigger chain submissions, if any
    await this.siwfV2Service.queueChainActions(payload);

    const response = this.siwfV2Service.getSiwfV2LoginResponse(payload);

    return response;
  }
}
