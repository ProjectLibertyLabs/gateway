import { Body, Controller, Delete, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import {
  BroadcastDto,
  AnnouncementResponseDto,
  AssetIncludedRequestDto,
  ReplyDto,
  ReactionDto,
  UpdateDto,
  TombstoneDto,
} from '#types/dtos/content-publishing';
import { AnnouncementTypeName } from '#types/enums';
import { MsaIdDto } from '#types/dtos/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'content' })
@ApiTags('v1/content')
export class ContentControllerV1 {
  constructor(
    private apiService: ApiService,
    @InjectPinoLogger(ContentControllerV1.name) private readonly logger: PinoLogger,
  ) {}

  @Post(':msaId/broadcast')
  @ApiOperation({ summary: 'Crete DSNP Broadcast for user' })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async broadcast(@Param() { msaId }: MsaIdDto, @Body() broadcastDto: BroadcastDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(broadcastDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeName.BROADCAST, msaId, broadcastDto, metadata);
  }

  @Post(':msaId/reply')
  @ApiOperation({ summary: 'Create DSNP Reply for user' })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async reply(@Param() { msaId }: MsaIdDto, @Body() replyDto: ReplyDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(replyDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeName.REPLY, msaId, replyDto, metadata);
  }

  @Post(':msaId/reaction')
  @ApiOperation({ summary: 'Create DSNP Reaction for user' })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async reaction(@Param() { msaId }: MsaIdDto, @Body() reactionDto: ReactionDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeName.REACTION, msaId, reactionDto);
  }

  @Put(':msaId')
  @ApiOperation({ summary: 'Update DSNP Content for user' })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async update(@Param() { msaId }: MsaIdDto, @Body() updateDto: UpdateDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(updateDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeName.UPDATE, msaId, updateDto, metadata);
  }

  @Delete(':msaId')
  @ApiOperation({
    summary: 'Delete DSNP Content for user [deprecated; use `POST /v2/content/{msaId}/tombstones` instead]',
    deprecated: true,
  })
  @HttpCode(202)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  async delete(@Param() { msaId }: MsaIdDto, @Body() tombstoneDto: TombstoneDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeName.TOMBSTONE, msaId, tombstoneDto);
  }
}
