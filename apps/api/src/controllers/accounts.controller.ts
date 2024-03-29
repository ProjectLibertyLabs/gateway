import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  HttpException,
} from '@nestjs/common';
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

  @Post('/user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to create a new user account' })
  @ApiOkResponse({ description: 'Account created successfully' })
  /**
   * Creates a user account using the provided query parameters.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an array of AccountDTO objects representing the created accounts.
   * @throws An error if the account creation fails.
   */
  createAccount() {
    try {
      const account = this.accountsService.createUserAccount();
      return account;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to create account');
    }
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch an account given an msaId.' })
  @ApiOkResponse({ description: 'Found account' })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to an array of AccountDTO objects representing the found account.
   * @throws An error if the account cannot be found.
   */
  async getAccount(@Param('msaId') msaId: number): Promise<AccountResponse | HttpException> {
    try {
      const account = await this.accountsService.getAccount(msaId);
      return account;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the account', HttpStatus.BAD_REQUEST);
    }
  }
}
