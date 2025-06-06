import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'handles' })
@ApiTags('v1/handles')
@UseGuards(ReadOnlyGuard)
export class HandlesControllerV1 {
  constructor(
    private handlesService: HandlesService,
    private readonly logger: PinoLogger,
    @InjectPinoLogger(HandlesService.name)
    private enqueueService: EnqueueService,
    private blockchainService: BlockchainRpcQueryService,
  ) {
    // this.logger.setContext(this.constructor.name);
  }

  /**
   * Validates the provided handle by checking its validity using the blockchain service.
   * If the handle is not valid, a BadRequestException is thrown.
   *
   * @param baseHandle - The handle to be validated.
   * @throws {BadRequestException} If the handle is invalid.
   * @returns {Promise<void>} A promise that resolves if the handle is valid.
   */
  async validateHandle(baseHandle: string): Promise<void> {
    const isValidHandle = await this.blockchainService.isValidHandle(baseHandle);
    if (isValidHandle.isFalse) {
      throw new BadRequestException('Invalid handle provided!');
    }
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to create a new handle for an account' })
  @ApiOkResponse({ description: 'Handle creation request enqueued', type: TransactionResponse })
  @ApiBadRequestResponse({ description: 'Invalid handle provided or provided signature is not valid for the payload!' })
  /**
   * Creates a handle using the provided query parameters.
   * @param queryParams - The query parameters for creating the account.
   * @returns A message that the handle creation is in progress.
   * @throws An error if the handle creation fails.
   */
  async createHandle(@Body() createHandleRequest: HandleRequestDto): Promise<TransactionResponse> {
    await this.validateHandle(createHandleRequest.payload.baseHandle);
    if (!this.handlesService.verifyHandleRequestSignature(createHandleRequest)) {
      throw new BadRequestException('Provided signature is not valid for the payload!');
    }
    const response = await this.enqueueService.enqueueRequest<CreateHandleRequest>({
      ...createHandleRequest,
      type: TransactionType.CREATE_HANDLE,
    });
    this.logger.info(`createHandle in progress. referenceId: ${response.referenceId}`);
    return response;
  }

  @Post('/change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to change a handle' })
  @ApiOkResponse({ description: 'Handle change request enqueued', type: TransactionResponse })
  @ApiBadRequestResponse({ description: 'Invalid handle provided or provided signature is not valid for the payload!' })
  /**
   * Using the provided query parameters, removes the old handle and creates a new one.
   * @param queryParams - The query parameters for changing the handle.
   * @returns A message that the handle change is in progress.
   * @throws An error if the handle creation fails.
   */
  async changeHandle(@Body() changeHandleRequest: HandleRequestDto): Promise<TransactionResponse> {
    await this.validateHandle(changeHandleRequest.payload.baseHandle);
    if (!this.handlesService.verifyHandleRequestSignature(changeHandleRequest)) {
      throw new BadRequestException('Provided signature is not valid for the payload!');
    }
    const response = await this.enqueueService.enqueueRequest<ChangeHandleRequest>({
      ...changeHandleRequest,
      type: TransactionType.CHANGE_HANDLE,
    });
    this.logger.info(`changeHandle in progress. referenceId: ${response.referenceId}`);
    return response;
  }

  @Get('change/:newHandle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a properly encoded ClaimHandlePayload that can be signed.' })
  @ApiOkResponse({
    description: 'Returned an encoded ClaimHandlePayload for signing',
    type: ChangeHandlePayloadRequest,
  })
  @ApiBadRequestResponse({ description: 'Invalid handle provided' })
  /**
   * Using the provided query parameters, creates a new payload that can be signed to change handle.
   * @param queryParams - The query parameters for changing the handle.
   * @returns Payload is included for convenience. Encoded payload to be used when signing the transaction.
   * @throws An error if the change handle payload creation fails.
   */
  async getChangeHandlePayload(@Param() { newHandle }: HandleDto): Promise<ChangeHandlePayloadRequest> {
    const expiration = await this.handlesService.getExpiration();
    await this.validateHandle(newHandle);
    const payload = { baseHandle: newHandle, expiration };
    const encodedPayload = u8aToHex(this.handlesService.encodePayload(payload).toU8a());

    return {
      payload,
      encodedPayload,
    };
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
    const handle = await this.handlesService.getHandle(msaId);
    if (!handle) {
      throw new NotFoundException(`No handle found for MSA Id ${msaId}`);
    }
    return handle;
  }
}
