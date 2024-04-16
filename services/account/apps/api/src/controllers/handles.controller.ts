import { Controller, Get, Post, HttpCode, HttpStatus, Logger, Param, HttpException, Body } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HandlesService } from '../services/handles.service';
import { HandleRequest } from '../../../../libs/common/src/types/dtos/handles.dto';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { TransactionType } from '../../../../libs/common/src/types/enums';

@Controller('handles')
@ApiTags('handles')
export class HandlesController {
  private readonly logger: Logger;

  constructor(private handlesService: HandlesService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to create a new handle for an account' })
  @ApiOkResponse({ description: 'Handle created successfully' })
  @ApiBody({ type: HandleRequest })
  /**
   * Creates a handle using the provided query parameters.
   * @param queryParams - The query parameters for creating the account.
   * @returns A message that the handle creation is in progress.
   * @throws An error if the handle creation fails.
   */
  async createHandle(@Body() createHandleRequest: HandleRequest) {
    try {
      const { referenceId } = await this.handlesService.enqueueRequest({
        ...createHandleRequest,
        type: TransactionType.CREATE_HANDLE,
      });
      this.logger.log(`createHandle in progress. referenceId: ${referenceId}`);
      return `createHandle in progress. referenceId: ${referenceId}`;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to create handle');
    }
  }

  @Post('/change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to change a handle' })
  @ApiOkResponse({ description: 'Handle changed successfully' })
  @ApiBody({ type: HandleRequest })
  /**
   * Using the provided query parameters, removes the old handle and creates a new one.
   * @param queryParams - The query parameters for changing the handle.
   * @returns A message that the handle change is in progress.
   * @throws An error if the handle creation fails.
   */
  async changeHandle(@Body() changeHandleRequest: HandleRequest) {
    try {
      const { referenceId } = await this.handlesService.enqueueRequest({
        ...changeHandleRequest,
        type: TransactionType.CHANGE_HANDLE,
      });
      this.logger.log(`changeHandle in progress. referenceId: ${referenceId}`);
      return `changeHandle in progress. referenceId: ${referenceId}`;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to change handle');
    }
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a handle given an msaId.' })
  @ApiOkResponse({ description: 'Found account' })
  /**
   * Gets a handle for msaId.
   * @param queryParams - The msaId for finding the handle.
   * @returns A promise that resolves to a Handle object, representing the found handle.
   * @throws An error if the handle cannot be found.
   */
  async getHandle(@Param('msaId') msaId: number): Promise<HandleResponse> {
    try {
      const handle = await this.handlesService.getHandle(msaId);
      return handle;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find the handle.', HttpStatus.BAD_REQUEST);
    }
  }
}
