import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiPayloadTooLargeResponse, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import { AnnouncementResponseDto, OnChainContentDto } from '#types/dtos/content-publishing';
import { SchemaIdDto } from '#types/dtos/common';
import { ParseMsaIdPipe } from '#utils/decorators/is-msa-id.decorator';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';

@Controller({ version: '2', path: 'content' })
@ApiTags('v2/content')
export class ContentControllerV2 {
  constructor(
    private apiService: ApiService,
    private readonly blockchainService: BlockchainRpcQueryService,
    // eslint-disable-next-line no-empty-function
  ) {}

  // eslint-disable-next-line class-methods-use-this
  @Post(':schemaId/onChainContent')
  @ApiOperation({ summary: 'Create on-chain content for a given schema' })
  @ApiQuery({
    name: 'onBehalfOf',
    required: false,
    type: 'string',
    description: 'Optional MSA ID this post is on behalf of',
  })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async postContent(
    @Param() { schemaId }: SchemaIdDto,
    @Body() contentDto: OnChainContentDto,
    @Query('onBehalfOf', ParseMsaIdPipe) onBehalfOf?: string,
  ) {
    const api = await this.blockchainService.getApi();
    console.log('Content-legnth: ', contentDto.payload.byteLength);
    if (contentDto.payload.byteLength > api.consts.messages.messagesMaxPayloadSizeBytes.toNumber()) {
      throw new PayloadTooLargeException('Message payload too large');
    }
    const schemaInfo = await this.blockchainService.getSchema(schemaId);
    if (!schemaInfo.payloadLocation.isOnChain) {
      throw new UnprocessableEntityException('Schema payload location invalid for on-chain content');
    }
    return this.apiService.enqueueContent(schemaId, contentDto, onBehalfOf) as Promise<AnnouncementResponseDto>;
  }
}
