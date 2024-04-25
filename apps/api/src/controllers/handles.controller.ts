import { Controller, Get, Post, HttpCode, HttpStatus, Logger, Param, HttpException, Body } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { TransactionResponse } from '../../../../libs/common/src/types/dtos/transaction.response.dto';
import { HandlesService } from '../services/handles.service';
import {
  ChangeHandleRequest,
  CreateHandleRequest,
  HandleRequest,
} from '../../../../libs/common/src/types/dtos/handles.request.dto';
import { TransactionType } from '../../../../libs/common/src/types/enums';
import { EnqueueService } from '../../../../libs/common/src/services/enqueue-request.service';

@Controller('handles')
@ApiTags('handles')
export class HandlesController {
  private readonly logger: Logger;

  constructor(
    private handlesService: HandlesService,
    private enqueueService: EnqueueService,
  ) {
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
  async createHandle(@Body() createHandleRequest: HandleRequest): Promise<TransactionResponse> {
    try {
      const response = await this.enqueueService.enqueueRequest<CreateHandleRequest>({
        ...createHandleRequest,
        type: TransactionType.CREATE_HANDLE,
      });
      this.logger.log(`createHandle in progress. referenceId: ${response.referenceId}`);
      return response;
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
  async changeHandle(@Body() changeHandleRequest: HandleRequest): Promise<TransactionResponse> {
    try {
      const response = await this.enqueueService.enqueueRequest<ChangeHandleRequest>({
        ...changeHandleRequest,
        type: TransactionType.CHANGE_HANDLE,
      });
      this.logger.log(`changeHandle in progress. referenceId: ${response.referenceId}`);
      return response;
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
