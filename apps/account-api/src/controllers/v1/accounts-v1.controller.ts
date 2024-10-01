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
  Inject,
  NotFoundException,
  ForbiddenException,
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
    this.logger.debug('Received request for Sign In With Frequency Configuration');
    return this.accountsService.getSIWFConfig();
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
    this.logger.debug(`Received request to get account with msaId: ${msaId}`);
    const account = await this.accountsService.getAccount(msaId);
    if (account) return account;
    throw new NotFoundException(`Failed to find the account ${msaId}`);
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
    this.logger.debug(`Received request to get account with accountId: ${accountId}`);
    const response = await this.accountsService.getMsaIdForAccountId(accountId);
    if (response?.msaId) {
      const account = await this.accountsService.getAccount(response.msaId);
      if (account) return account;
    }
    throw new NotFoundException(`Failed to find the account ${accountId}`);
  }

  @Post('siwf')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to Sign In With Frequency' })
  @ApiCreatedResponse({ description: 'Signed in successfully', type: WalletLoginResponseDto })
  @ApiBody({ type: WalletLoginRequestDto })
  async postSignInWithFrequency(@Body() walletLoginRequest: WalletLoginRequestDto): Promise<WalletLoginResponseDto> {
    if (this.config.isDeployedReadOnly && walletLoginRequest.signUp) {
      throw new ForbiddenException('New account sign-up unavailable in read-only mode');
    }
    this.logger.debug(`Received Sign In With Frequency request: ${JSON.stringify(walletLoginRequest)}`);
    return this.accountsService.signInWithFrequency(walletLoginRequest);
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
    const result = await this.accountsService.getRetireMsaPayload(accountId);
    if (result) return result;
    throw new NotFoundException(`MSA Id for requested account '${accountId}' was not found.`);
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
    return this.accountsService.retireMsa(retireMsaRequest);
  }
}
