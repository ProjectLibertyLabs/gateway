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
import { KeysService } from '../services/keys.service';
import { KeysResponse } from '../../../../libs/common/src/dtos/keys.dto';

@Controller('keys')
@ApiTags('keys')
export class KeysController {
  private readonly logger: Logger;

  constructor(private keysService: KeysService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to create a new handle' })
  @ApiOkResponse({ description: 'Handle created successfully' })
  /**
   * Creates keys using the provided query parameters.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to...?
   * @throws An error if the key creation fails.
   */
  createKeys(@Param('msaId') msaId: number) {
    try {
      const accountWithHandle = this.keysService.createKeys();
      return accountWithHandle;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to create handle');
    }
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch an account given an msaId.' })
  @ApiOkResponse({ description: 'Found account' })
  /**
   * Gets an account.
   * @param queryParams - The query parameters for creating the handle.
   * @returns A promise that resolves to an array of AccountDTO objects representing the found handle.
   * @throws An error if the handle cannot be found.
   */
  async getKeys(@Param('msaId') msaId: number): Promise<KeysResponse> {
    try {
      const account = await this.keysService.getKeys(msaId);
      return account;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the handle.', HttpStatus.BAD_REQUEST);
    }
  }
}
