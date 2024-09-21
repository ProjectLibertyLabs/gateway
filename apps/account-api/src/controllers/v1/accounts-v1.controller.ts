import { AccountsService } from '#account-api/services/accounts.service';
import { AccountResponseDto, RetireMsaPayloadResponseDto } from '#types/dtos/account/accounts.response.dto';
import { WalletLoginRequestDto } from '#types/dtos/account/wallet.login.request.dto';
import { WalletLoginConfigResponseDto } from '#types/dtos/account/wallet.login.config.response.dto';
import { WalletLoginResponseDto } from '#types/dtos/account/wallet.login.response.dto';
import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  HttpException,
  Inject,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RetireMsaRequestDto, TransactionResponse } from '#types/dtos/account';
import { AccountIdDto, MsaIdDto } from '#types/dtos/common';
import blockchainConfig, { IBlockchainConfig } from '#account-lib/blockchain/blockchain.config';

@Controller('v1/accounts')
@ApiTags('v1/accounts')
export class AccountsControllerV1 {
  private readonly logger: Logger;

  constructor(
    private accountsService: AccountsService,
    @Inject(blockchainConfig.KEY) private config: IBlockchainConfig,
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
  async getAccountForMsa(@Param() { msaId }: MsaIdDto): Promise<AccountResponseDto> {
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
  @ApiOperation({ summary: 'Fetch an account given an Account Id' })
  @ApiOkResponse({ description: 'Found account', type: AccountResponseDto })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an Account object => {msaId, handle}.
   * @throws An error if the msaId or account cannot be found.
   */
  async getAccountForAccountId(@Param() { accountId }: AccountIdDto): Promise<AccountResponseDto> {
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
    if (this.config.isDeployedReadOnly && walletLoginRequest.signUp) {
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
  @ApiOkResponse({ description: 'Created extrinsic', type: RetireMsaPayloadResponseDto })
  /**
   * Gets the signer payload and encoded payload needed to retire a msa.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an object consisting of a retire msa encodedExtrinsic hex string and payloadToSign hex string.
   * @throws An error if the payload fails to be created.
   */
  async getRetireMsaPayload(@Param() { accountId }: AccountIdDto): Promise<RetireMsaPayloadResponseDto> {
    try {
      const result = await this.accountsService.getRetireMsaPayload(accountId);
      if (result) return result;
      throw new HttpException('MSA ID requested to retire was not found.', HttpStatus.NOT_FOUND);
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to create a retireMsa unsigned, encoded extrinsic.', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('retireMsa')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to retire an MSA ID.' })
  @ApiCreatedResponse({ description: 'Created and queued request to retire an MSA ID', type: TransactionResponse })
  @ApiBody({ type: RetireMsaRequestDto })
  /**
   * Posts the signer and payload, signing the retire msa payload and executing that extrinsic.
   * @returns Returns a TransactionResponse hex string when the extrinsic is added to the queue.
   * @throws An error if the signed extrinsic fails to be created.
   */
  async postRetireMsa(@Body() retireMsaRequest: RetireMsaRequestDto): Promise<TransactionResponse> {
    try {
      return this.accountsService.retireMsa(retireMsaRequest);
    } catch (error) {
      const errorMessage = 'Failed to retire MSA ID.';
      this.logger.error(`${errorMessage}: ${error}`);
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }
}
