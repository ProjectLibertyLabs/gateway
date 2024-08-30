import { AccountsService } from '#api/services/accounts.service';
import { AccountResponseDto } from '#lib/types/dtos/accounts.response.dto';
import { WalletLoginRequestDto } from '#lib/types/dtos/wallet.login.request.dto';
import { WalletLoginConfigResponseDto } from '#lib/types/dtos/wallet.login.config.response.dto';
import { WalletLoginResponseDto } from '#lib/types/dtos/wallet.login.response.dto';
import { Body, Controller, Get, Post, HttpCode, HttpStatus, Logger, Param, HttpException } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '#lib/config';

@Controller('v1/accounts')
@ApiTags('v1/accounts')
export class AccountsControllerV1 {
  private readonly logger: Logger;

  constructor(
    private accountsService: AccountsService,
    private readonly configService: ConfigService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get('siwf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the Sign In With Frequency configuration' })
  @ApiOkResponse({ description: 'Returned SIWF Configuration data', type: WalletLoginConfigResponseDto })
  async getSIWFConfig(): Promise<WalletLoginConfigResponseDto> {
    try {
      this.logger.debug('Received request for Sign In With Frequency Configuration');
      return this.accountsService.getSIWFConfig();
    } catch (error) {
      const errorMessage = 'Failed to get the Sign In With Frequency configuration';
      this.logger.error(`${errorMessage}: ${error}`);
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch an account given an MSA Id' })
  @ApiOkResponse({ description: 'Found account', type: AccountResponseDto })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an Account object => {msaId, handle}.
   * @throws An error if the account cannot be found.
   */
  async getAccountForMsa(@Param('msaId') msaId: string): Promise<AccountResponseDto> {
    try {
      this.logger.debug(`Received request to get account with msaId: ${msaId}`);
      const account = await this.accountsService.getAccount(msaId);
      if (account) return account;
      throw new HttpException('Failed to find the account', HttpStatus.NOT_FOUND);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to find the account', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('account/:publicKey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch an account given a public key' })
  @ApiOkResponse({ description: 'Found account', type: AccountResponseDto })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an Account object => {msaId, handle}.
   * @throws An error if the msaId or account cannot be found.
   */
  async getAccountForPublicKey(@Param('publicKey') publicKey: string): Promise<AccountResponseDto> {
    try {
      this.logger.debug(`Received request to get account with publicKey: ${publicKey}`);
      const response = await this.accountsService.getMsaIdForPublicKey(publicKey);
      if (response?.msaId) {
        const account = await this.accountsService.getAccount(response.msaId);
        if (account) return account;
      }
      throw new HttpException('Failed to find the account', HttpStatus.NOT_FOUND);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to find the account', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('siwf')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to Sign In With Frequency' })
  @ApiCreatedResponse({ description: 'Signed in successfully', type: WalletLoginResponseDto })
  @ApiBody({ type: WalletLoginRequestDto })
  async postSignInWithFrequency(@Body() walletLoginRequest: WalletLoginRequestDto): Promise<WalletLoginResponseDto> {
    if (this.configService.isReadOnly && walletLoginRequest.signUp) {
      throw new HttpException('New account sign-up unavailable in read-only mode', HttpStatus.FORBIDDEN);
    }
    try {
      this.logger.debug(`Received Sign In With Frequency request: ${JSON.stringify(walletLoginRequest)}`);
      return this.accountsService.signInWithFrequency(walletLoginRequest);
    } catch (error: any) {
      const errorMessage = 'Failed to Sign In With Frequency';
      this.logger.error(errorMessage, error, error?.stack);
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }
}
