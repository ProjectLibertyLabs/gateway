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
import { TransactionType } from '#lib/types/enums';
import { HandlesService } from '#api/services/handles.service';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import {
  ChangeHandlePayloadRequest,
  ChangeHandleRequest,
  CreateHandleRequest,
} from '#lib/types/dtos/handles.request.dto';
import { ChangeHandleRequest, CreateHandleRequest, HandleRequestDto } from '#lib/types/dtos/handles.request.dto';
import { TransactionResponse } from '#lib/types/dtos/transaction.response.dto';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { HandleResponseDto } from '#lib/types/dtos/accounts.response.dto';

@Controller('v1/handles')
@ApiTags('v1/handles')
export class HandlesControllerV1 {
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
  @ApiBody({ type: HandleRequestDto })
  /**
   * Creates a handle using the provided query parameters.
   * @param queryParams - The query parameters for creating the account.
   * @returns A message that the handle creation is in progress.
   * @throws An error if the handle creation fails.
   */
  async createHandle(@Body() createHandleRequest: HandleRequestDto): Promise<TransactionResponse> {
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
  @ApiBody({ type: HandleRequestDto })
  /**
   * Using the provided query parameters, removes the old handle and creates a new one.
   * @param queryParams - The query parameters for changing the handle.
   * @returns A message that the handle change is in progress.
   * @throws An error if the handle creation fails.
   */
  async changeHandle(@Body() changeHandleRequest: HandleRequestDto): Promise<TransactionResponse> {
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

  @Get('change/:newHandle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a properly encoded ClaimHandlePayload that can be signed.' })
  @ApiOkResponse({ description: 'Returned an encoded ClaimHandlePayload for signing' })
  /**
   * Using the provided query parameters, creates a new payload that can be signed to change handle.
   * @param queryParams - The query parameters for changing the handle.
   * @returns Payload is included for convenience. Encoded payload to be used when signing the transaction.
   * @throws An error if the change handle payload creation fails.
   */
  async getChangeHandlePayload(@Param('newHandle') newHandle: string): Promise<ChangeHandlePayloadRequest> {
    try {
      const expiration = await this.handlesService.getExpiration();
      const payload = { baseHandle: newHandle, expiration };
      const encodedPayload = u8aToHex(u8aWrapBytes(this.handlesService.encodePayload(payload).toU8a()));

      return {
        payload,
        encodedPayload,
      };
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to create change handle payload.');
    }
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a handle given an MSA Id' })
  @ApiOkResponse({ description: 'Found a handle' })
  /**
   * Gets a handle for msaId.
   * @param queryParams - The msaId for finding the handle.
   * @returns A promise that resolves to a Handle object, representing the found handle.
   * @throws An error if the handle cannot be found.
   */
  async getHandle(@Param('msaId') msaId: string): Promise<HandleResponseDto> {
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
