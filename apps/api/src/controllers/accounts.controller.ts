import { AccountsService } from '#api/services/accounts.service';
import { AccountResponse } from '#lib/types/dtos/accounts.response.dto';
import { WalletLoginConfigResponse } from '#lib/types/dtos/wallet.login.config.response.dto';
import { WalletLoginRequest } from '#lib/types/dtos/wallet.login.request.dto';
import { WalletLoginResponse } from '#lib/types/dtos/wallet.login.response.dto';
import { Body, Controller, Get, Post, HttpCode, HttpStatus, Logger, Param, HttpException } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('accounts')
@ApiTags('accounts')
export class AccountsController {
  private readonly logger: Logger;

  constructor(private accountsService: AccountsService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get('siwf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the Sign-In With Frequency Configuration' })
  @ApiOkResponse({ description: 'Returned SIWF Configuration data', type: WalletLoginConfigResponse })
  async getSIWFConfig(): Promise<WalletLoginConfigResponse> {
    try {
      return this.accountsService.getSIWFConfig();
    } catch (error) {
      const errorMessage = 'Failed to get the Sign-In With Frequency Configuration';
      this.logger.error(`${errorMessage}: ${error}`);
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch an account given an msaId.' })
  @ApiOkResponse({ description: 'Found account' })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an Account object => {msaId, handle}.
   * @throws An error if the account cannot be found.
   */
  async getAccount(@Param('msaId') msaId: number): Promise<AccountResponse> {
    try {
      return await this.accountsService.getAccount(msaId);
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the account', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('siwf')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to sign in with Frequency' })
  @ApiCreatedResponse({ description: 'Signed in successfully', type: WalletLoginResponse })
  @ApiBody({ type: WalletLoginRequest })
  async signInWithFrequency(@Body() walletLoginRequest: WalletLoginRequest): Promise<WalletLoginResponse> {
    try {
      this.logger.log(`Received Sign-In With Frequency request: ${JSON.stringify(walletLoginRequest)}`);
      return await this.accountsService.signInWithFrequency(walletLoginRequest);
    } catch (error) {
      const errorMessage = 'Failed to Sign In With Frequency';
      this.logger.error(`${errorMessage}: ${error}`);
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }
}
