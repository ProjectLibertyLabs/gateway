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
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HandlesService } from '#account-api/services/handles.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import {
  ChangeHandlePayloadRequest,
  ChangeHandleRequest,
  CreateHandleRequest,
  HandleRequestDto,
} from '#types/dtos/account/handles.request.dto';
import { TransactionResponse } from '#types/dtos/account/transaction.response.dto';
import { HandleResponseDto } from '#types/dtos/account/accounts.response.dto';
import { ReadOnlyGuard } from '#account-api/guards/read-only.guard';
import { u8aToHex } from '@polkadot/util';
import { TransactionType } from '#types/account-webhook';
import { HandleDto, MsaIdDto } from '#types/dtos/common';

@Controller('v1/handles')
@ApiTags('v1/handles')
@UseGuards(ReadOnlyGuard)
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
  @ApiOkResponse({ description: 'Handle creation request enqueued', type: TransactionResponse })
  /**
   * Creates a handle using the provided query parameters.
   * @param queryParams - The query parameters for creating the account.
   * @returns A message that the handle creation is in progress.
   * @throws An error if the handle creation fails.
   */
  async createHandle(@Body() createHandleRequest: HandleRequestDto): Promise<TransactionResponse> {
    try {
      if (!this.handlesService.verifyHandleRequestSignature(createHandleRequest)) {
        throw new BadRequestException('Provided signature is not valid for the payload!');
      }
      const response = await this.enqueueService.enqueueRequest<CreateHandleRequest>({
        ...createHandleRequest,
        type: TransactionType.CREATE_HANDLE,
      });
      this.logger.log(`createHandle in progress. referenceId: ${response.referenceId}`);
      return response;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(error);
      throw new Error('Failed to create handle');
    }
  }

  @Post('/change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to change a handle' })
  @ApiOkResponse({ description: 'Handle change request enqueued', type: TransactionResponse })
  /**
   * Using the provided query parameters, removes the old handle and creates a new one.
   * @param queryParams - The query parameters for changing the handle.
   * @returns A message that the handle change is in progress.
   * @throws An error if the handle creation fails.
   */
  async changeHandle(@Body() changeHandleRequest: HandleRequestDto): Promise<TransactionResponse> {
    try {
      if (!this.handlesService.verifyHandleRequestSignature(changeHandleRequest)) {
        throw new BadRequestException('Provided signature is not valid for the payload!');
      }
      const response = await this.enqueueService.enqueueRequest<ChangeHandleRequest>({
        ...changeHandleRequest,
        type: TransactionType.CHANGE_HANDLE,
      });
      this.logger.log(`changeHandle in progress. referenceId: ${response.referenceId}`);
      return response;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(error);
      throw new Error('Failed to change handle');
    }
  }

  @Get('change/:newHandle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a properly encoded ClaimHandlePayload that can be signed.' })
  @ApiOkResponse({
    description: 'Returned an encoded ClaimHandlePayload for signing',
    type: ChangeHandlePayloadRequest,
  })
  /**
   * Using the provided query parameters, creates a new payload that can be signed to change handle.
   * @param queryParams - The query parameters for changing the handle.
   * @returns Payload is included for convenience. Encoded payload to be used when signing the transaction.
   * @throws An error if the change handle payload creation fails.
   */
  async getChangeHandlePayload(@Param() { newHandle }: HandleDto): Promise<ChangeHandlePayloadRequest> {
    try {
      const expiration = await this.handlesService.getExpiration();
      const payload = { baseHandle: newHandle, expiration };
      const encodedPayload = u8aToHex(this.handlesService.encodePayload(payload).toU8a());

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
  @ApiOkResponse({ description: 'Found a handle', type: HandleResponseDto })
  /**
   * Gets a handle for msaId.
   * @param queryParams - The msaId for finding the handle.
   * @returns A promise that resolves to a Handle object, representing the found handle.
   * @throws An error if the handle cannot be found.
   */
  async getHandle(@Param() { msaId }: MsaIdDto): Promise<HandleResponseDto> {
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
