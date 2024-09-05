import { AccountsService } from '#api/services/accounts.service';
import { AccountResponseDto } from '#lib/types/dtos/accounts.response.dto';
import { WalletLoginRequestDto } from '#lib/types/dtos/wallet.login.request.dto';
import { WalletLoginConfigResponseDto } from '#lib/types/dtos/wallet.login.config.response.dto';
import { WalletLoginResponseDto } from '#lib/types/dtos/wallet.login.response.dto';
import { Body, Controller, Get, Post, HttpCode, HttpStatus, Logger, Param, HttpException } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '#lib/config';
import { GenericExtrinsicPayload } from '@polkadot/types';
import { TransactionResponse } from '#lib/types/dtos';
import { RetireMsaRequestDto } from '#lib/types/dtos/accounts.request.dto';
import { ExtrinsicPayload } from '@polkadot/types/interfaces';
import { ExtrinsicPayloadValue } from '@polkadot/types/types/extrinsic';
import { SignerPayloadJSON } from '@polkadot/types/types';
import { HexString } from '@polkadot/util/types';

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

  @Get('account/:accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch an account given a public key' })
  @ApiOkResponse({ description: 'Found account', type: AccountResponseDto })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an Account object => {msaId, handle}.
   * @throws An error if the msaId or account cannot be found.
   */
  async getAccountForAccountId(@Param('accountId') accountId: string): Promise<AccountResponseDto> {
    try {
      this.logger.debug(`Received request to get account with accountId: ${accountId}`);
      const response = await this.accountsService.getMsaIdForAccountId(accountId);
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

  @Get('retireMsa/:accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a retireMsa unsigned, encoded extrinsic payload.' })
  @ApiOkResponse({ description: 'Created extrinsic' })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an Account object => {msaId, handle}.
   * @throws An error if the msaId or account cannot be found.
   */
  async getRetireMsaPayload(
    @Param('accountId') accountId: string,
  ): Promise<{ unsignedPayload: SignerPayloadJSON; encodedPayload: HexString; signature: HexString }> {
    try {
      return this.accountsService.getRetireMsaPayload(accountId);
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to create a retireMsa unsigned, encoded extrinsic.', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('retireMsa')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to retire an Msa Id.' })
  @ApiCreatedResponse({ description: 'Signed in successfully', type: TransactionResponse })
  @ApiBody({ type: RetireMsaRequestDto })
  async postRetireMsa(@Body() retireMsaRequest: RetireMsaRequestDto): Promise<TransactionResponse> {
    try {
      return this.accountsService.retireMsa(retireMsaRequest);
    } catch (error) {
      const errorMessage = 'Failed to Sign In With Frequency';
      this.logger.error(`${errorMessage}: ${error}`);
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }
}
