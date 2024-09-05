import {
  BadRequestException, Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param, Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags} from '@nestjs/swagger';
import { GraphsService } from '#api/services/graphs.service';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import {
  AddNewGraphKeyPayloadRequest, AddNewGraphKeyRequestDto,
  GraphKeysRequestDto,
  ItemizedSignaturePayloadDto
} from '#lib/types/dtos/graphs.request.dto';
import { HexString } from '@polkadot/util/types';
import { isHexString } from '#lib/utils/utility';
import {ChangeHandleRequest, HandleRequestDto, TransactionResponse} from "#lib/types/dtos";
import {TransactionType} from "#lib/types/enums";

@Controller('v1/graphs')
@ApiTags('v1/graphs')
export class GraphsControllerV1 {
  private readonly logger: Logger;

  constructor(
    private graphsService: GraphsService,
    private enqueueService: EnqueueService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get('addKey/:msaId')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: 'newKey',
    description: 'New public key to be added in hex format',
    type: 'string',
    required: true,
  })
  @ApiOperation({ summary: 'Get a properly encoded StatefulStorageItemizedSignaturePayloadV2 that can be signed.' })
  @ApiOkResponse({ description: 'Returned an encoded StatefulStorageItemizedSignaturePayloadV2 for signing' })
  /**
   * Using the provided query parameters, creates a new payload that can be signed to add new graph keys.
   * @param queryParams - The query parameters for adding a new key
   * @returns Payload is included for convenience. Encoded payload to be used when signing the transaction.
   * @throws An error if the change handle payload creation fails.
   */
  async getAddKeyPayload(
    @Param('msaId') msaId: string,
    @Query('newKey') newKey: HexString,
  ): Promise<AddNewGraphKeyPayloadRequest> {
    if (!isHexString(newKey)) {
      throw new BadRequestException('Not a valid Hex value!');
    }
    return this.graphsService.getAddingNewKeyPayload(msaId, newKey);
  }

  @Post('/addKey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to add a new key' })
  @ApiOkResponse({ description: 'Add new key request enqueued' })
  @ApiBody({ type: AddNewGraphKeyRequestDto })
  /**
   * Using the provided query parameters, removes the old handle and creates a new one.
   * @param queryParams - The query parameters for changing the handle.
   * @returns A message that the handle change is in progress.
   * @throws An error if the handle creation fails.
   */
  async addNewKey(@Body() request: AddNewGraphKeyRequestDto): Promise<TransactionResponse> {
    try {
      const response = await this.enqueueService.enqueueRequest<GraphKeysRequestDto>({
        ...request,
        type: TransactionType.ADD_GRAPH_KEY,
      });
      this.logger.log(`Add graph key in progress. referenceId: ${response.referenceId}`);
      return response;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to add new key');
    }
  }
}
