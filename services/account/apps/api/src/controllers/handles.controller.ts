import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  HttpException,
  Body,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HandlesService } from '../services/handles.service';
import { HandlesRequest, HandlesResponse } from '../../../../libs/common/src/dtos/handles.dtos';

@Controller('handles')
@ApiTags('handles')
export class HandlesController {
  private readonly logger: Logger;

  constructor(private handlesService: HandlesService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to create a new handle' })
  @ApiOkResponse({ description: 'Handle created successfully' })
  @ApiBody({ type: HandlesRequest })
  /**
   * Creates a handle using the provided query parameters.
   * @param queryParams - The query parameters for creating the account.
   * @returns A promise that resolves to...?
   * @throws An error if the handle creation fails.
   */
  async createHandle(@Body() createHandleRequest: HandlesRequest) {
    try {
      const txnId = await this.handlesService.createHandle(createHandleRequest);
      this.logger.log(`createHandle in progress. TxnId: ${txnId}`);
      return { status: 202, message: `createHandle in progress. TxnId: ${txnId}` };
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
  async getHandle(@Param('msaId') msaId: number): Promise<HandlesResponse> {
    try {
      this.logger.log('MSA ID:', msaId);
      const account = await this.handlesService.getHandle(msaId);
      return account;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the handle.', HttpStatus.BAD_REQUEST);
    }
  }
}
