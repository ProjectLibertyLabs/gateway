import { Body, Controller, Get, Post, HttpCode, HttpStatus, Logger, Param, HttpException } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from '../services/accounts.service';
import { AccountResponse } from '../../../../libs/common/src/types/dtos/accounts.dto';
import { WalletLoginResponseDTO } from '../../../../libs/common/src/types/dtos/wallet.login.response.dto';
import { WalletLoginRequestDTO } from '../../../../libs/common/src/types/dtos/wallet.login.request.dto';

@Controller('accounts')
@ApiTags('accounts')
export class AccountsController {
  // private readonly logger: Logger;
  protected logger: Logger;

  constructor(private accountsService: AccountsService) {
    this.logger = new Logger(this.constructor.name);
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
      const account = await this.accountsService.getAccount(msaId);
      return account;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the account', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to sign in with Frequency' })
  @ApiOkResponse({ description: 'Signed in successfully', type: WalletLoginResponseDTO })
  @ApiBody({ type: WalletLoginRequestDTO })
  async signInWithFrequency(
    @Body() walletLoginRequestDTO: WalletLoginRequestDTO,
  ): Promise<WalletLoginResponseDTO | Response> {
    try {
      this.logger.log('Received Sign-In With Frequency request');
      this.logger.debug(`walletLoginRequestDTO: ${JSON.stringify(walletLoginRequestDTO)}`);
      const loginResponse = await this.accountsService.signInWithFrequency(walletLoginRequestDTO);
      return loginResponse;
    } catch (error) {
      this.logger.error(`Failed to Sign In With Frequency: ${error}`);
      throw new HttpException('Failed to Sign In With Frequency', HttpStatus.BAD_REQUEST);
    }
  }
}
