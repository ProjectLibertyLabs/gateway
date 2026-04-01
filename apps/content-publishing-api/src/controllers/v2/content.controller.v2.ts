import { Body, Controller, GoneException, HttpCode, Post, Param, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import {
  AnnouncementResponseDto,
  BatchFilesDto,
  OnChainContentDto,
  TombstoneDto,
} from '#types/dtos/content-publishing';
import { AnnouncementTypeName } from '#types/enums';
import { MsaIdDto } from '#types/dtos/common';

@Controller({ version: '2', path: 'content' })
@ApiTags('v2/content')
export class ContentControllerV2 {
  constructor(
    private readonly apiService: ApiService,
    // eslint-disable-next-line no-empty-function
  ) {}

  @Post(':msaId/on-chain')
  @ApiOperation({ summary: 'Create on-chain content for a given schema', deprecated: true })
  @HttpCode(HttpStatus.GONE)
  @ApiResponse({ status: HttpStatus.GONE, description: 'Deprecated endpoint' })
  async postContent(@Param() _msaId: MsaIdDto, @Body() _contentDto: OnChainContentDto): Promise<never> {
    throw new GoneException('Endpoint deprecated: use /v3/content/on-chain instead');
  }

  @Post('batchAnnouncement')
  @ApiOperation({ summary: 'Create off-chain batch content announcements' })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async postBatches(@Body() batchContentDto: BatchFilesDto): Promise<AnnouncementResponseDto[]> {
    const promises = batchContentDto.batchFiles.map((batchFile) => this.apiService.enqueueBatchRequest(batchFile));
    return Promise.all(promises);
  }

  @Post(':msaId/tombstones')
  @ApiOperation({ summary: 'Post an announcement that previously-announced content is invalid/revoked' })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async postTombstone(
    @Param() { msaId }: MsaIdDto,
    @Body() tombstoneDto: TombstoneDto,
  ): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeName.TOMBSTONE, msaId, tombstoneDto);
  }
}
