import { Controller, Get, Post, HttpCode, HttpStatus, Logger, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from '../services/accounts.service';
import { AccountResponse } from '../../../../libs/common/src/dtos/accounts.dto';

@Controller('accounts')
@ApiTags('account-service')
export class AccountsController {
  private readonly logger: Logger;

  constructor(private accountsService: AccountsService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to create a new account' })
  @ApiOkResponse({ description: 'Account created successfully' })
  /**
   * Creates an account using the provided query parameters.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an array of AccountDTO objects representing the created accounts.
   * @throws An error if the account creation fails.
   */
  async createAccount(): Promise<String> {
    try {
      const account = await this.accountsService.createAccount();
      // REMOVE:
      return account;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to create account');
    }
  }

  @Get(`accounts/:msaId`)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch an account given an msaId.' })
  @ApiOkResponse({ description: 'Found account' })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an array of AccountDTO objects representing the found account.
   * @throws An error if the account cannot be found.
   */
  async getAccount(@Param('msaId') msaId: string): Promise<AccountResponse> {
    try {
      const account = await this.accountsService.getAccount(msaId);
      return account;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to find the account: ' + msaId);
    }
  }
}
