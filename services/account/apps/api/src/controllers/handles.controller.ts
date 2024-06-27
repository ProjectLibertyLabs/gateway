import { Controller, Get, Post, HttpCode, HttpStatus, Logger, Param, HttpException, Body, Put } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { TransactionType } from '#lib/types/enums';
import { HandlesService } from '#api/services/handles.service';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { ChangeHandleRequest, CreateHandleRequest, HandleRequest } from '#lib/types/dtos/handles.request.dto';
import { TransactionResponse } from '#lib/types/dtos/transaction.response.dto';

@Controller('v1/handles')
@ApiTags('v1/handles')
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
  @ApiOkResponse({ description: 'Handle creation request enqueued' })
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
  @ApiOkResponse({ description: 'Handle change request enqueued' })
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
  @ApiOkResponse({ description: 'Found a handle' })
  /**
   * Gets a handle for msaId.
   * @param queryParams - The msaId for finding the handle.
   * @returns A promise that resolves to a Handle object, representing the found handle.
   * @throws An error if the handle cannot be found.
   */
  async getHandle(@Param('msaId') msaId: string): Promise<HandleResponse> {
    try {
      const handle = await this.handlesService.getHandle(msaId);
      if (!handle) {
        throw new HttpException('No handle found for MSA', HttpStatus.NOT_FOUND);
      }
      return handle;
    } catch (error: any) {
      this.logger.error(error);
      if (error instanceof HttpException) {
        throw error;
      }

      if (/invalid msa.*/i.test(error?.message)) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST, { cause: error });
      }
      throw new HttpException('Internal error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
