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
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from '../services/accounts.service';
import { Account, AccountResponse } from '../../../../libs/common/src/types/dtos/accounts.dto';

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
}
