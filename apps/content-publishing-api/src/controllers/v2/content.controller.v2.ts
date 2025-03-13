import {
  Body,
  Controller,
  HttpCode,
  Post,
  PayloadTooLargeException,
  UnprocessableEntityException,
  Param,
  UnauthorizedException,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import { AnnouncementResponseDto, BatchFilesDto, OnChainContentDto } from '#types/dtos/content-publishing';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { MsaIdDto } from '#types/dtos/common';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';

@Controller({ version: '2', path: 'content' })
@ApiTags('v2/content')
export class ContentControllerV2 {
  constructor(
    @Inject(apiConfig.KEY) private readonly appConfig: IContentPublishingApiConfig,
    private readonly apiService: ApiService,
    private readonly blockchainService: BlockchainRpcQueryService,
    // eslint-disable-next-line no-empty-function
  ) {}

  @Post(':msaId/on-chain')
  @ApiOperation({ summary: 'Create on-chain content for a given schema' })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async postContent(@Param() { msaId }: MsaIdDto, @Body() contentDto: OnChainContentDto) {
    const api = await this.blockchainService.getApi();

    // Check the payload size.
    // POTENTIAL OPTIMIZATIONS:
    //     1. (strlen - 2) / 2 + 2 (hex minus '0x' => bytes, plus 2 for SCALE length prefix of max payload size 3k)
    //     2. Buffer.from(hexstr) to get bytes, plus 2 for SCALE length prefix
    // This method is most accurate, though, and withstands any constant max payload changes on the chain (if max payload were to increase to > 16,383)
    const bytes = this.blockchainService.createType('Bytes', contentDto.payload);
    if (bytes.encodedLength > api.consts.messages.messagesMaxPayloadSizeBytes.toNumber()) {
      throw new PayloadTooLargeException('Message payload too large');
    }
    const schemaInfo = await this.blockchainService.getSchema(contentDto.schemaId);
    if (!schemaInfo.payloadLocation.isOnChain) {
      throw new UnprocessableEntityException('Schema payload location invalid for on-chain content');
    }
    // Check schema grants if publishing on behalf of a user
    const onBehalfOf = msaId === this.appConfig.providerId.toString() ? undefined : msaId;
    if (onBehalfOf) {
      if (
        !(await this.blockchainService.checkCurrentDelegation(
          onBehalfOf,
          contentDto.schemaId,
          this.appConfig.providerId,
        ))
      ) {
        throw new UnauthorizedException('Provider not delegated for schema by user');
      }
    }
    return this.apiService.enqueueContent(onBehalfOf, contentDto) as Promise<AnnouncementResponseDto>;
  }

  @Post('batchAnnouncement')
  @ApiOperation({ summary: 'Create off-chain batch content announcements' })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async postBatches(@Body() batchContentDto: BatchFilesDto): Promise<AnnouncementResponseDto[]> {
    const promises = batchContentDto.batchFiles.map((batchFile) => this.apiService.enqueueBatchRequest(batchFile));
    return Promise.all(promises);
  }
}
