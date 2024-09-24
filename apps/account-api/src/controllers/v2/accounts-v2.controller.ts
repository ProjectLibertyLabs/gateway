import { AccountsService } from '#account-api/services/accounts.service';
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
import blockchainConfig, { IBlockchainConfig } from '#account-lib/blockchain/blockchain.config';

@Controller('v2/accounts')
@ApiTags('v2/accounts')
export class AccountsControllerV2 {
  private readonly logger: Logger;

  constructor(
    private accountsService: AccountsService,
    @Inject(blockchainConfig.KEY) private config: IBlockchainConfig,
  ) {
    this.logger = new Logger(this.constructor.name);
  }
}
