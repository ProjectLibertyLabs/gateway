import { Body, Controller, Delete, HttpCode, Logger, Param, Post, Put, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiService } from './api.service';
import {
  AnnouncementResponseDto,
  AnnouncementTypeDto,
  AssetIncludedRequestDto,
  BroadcastDto,
  DsnpUserIdParam,
  ReactionDto,
  ReplyDto,
  TombstoneDto,
  UpdateDto,
} from '../../../libs/common/src';

@Controller('v1/content')
@ApiTags('content')
export class ContentController {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post(':userDsnpId/broadcast')
  @ApiOperation({ summary: 'Create DSNP Broadcast for User' })
  @HttpCode(202)
  async broadcast(@Param() userDsnpId: DsnpUserIdParam, @Body() broadcastDto: BroadcastDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(broadcastDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeDto.BROADCAST, userDsnpId.userDsnpId, broadcastDto, metadata);
  }

  @Post(':userDsnpId/reply')
  @ApiOperation({ summary: 'Create DSNP Reply for User' })
  @HttpCode(202)
  async reply(@Param() userDsnpId: DsnpUserIdParam, @Body() replyDto: ReplyDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(replyDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeDto.REPLY, userDsnpId.userDsnpId, replyDto, metadata);
  }

  @Post(':userDsnpId/reaction')
  @ApiOperation({ summary: 'Create DSNP Reaction for User' })
  @HttpCode(202)
  async reaction(@Param() userDsnpId: DsnpUserIdParam, @Body() reactionDto: ReactionDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeDto.REACTION, userDsnpId.userDsnpId, reactionDto);
  }

  @Put(':userDsnpId')
  @ApiOperation({ summary: 'Update DSNP Content for User' })
  @HttpCode(202)
  async update(@Param() userDsnpId: DsnpUserIdParam, @Body() updateDto: UpdateDto): Promise<AnnouncementResponseDto> {
    const metadata = await this.apiService.validateAssetsAndFetchMetadata(updateDto as AssetIncludedRequestDto);
    return this.apiService.enqueueRequest(AnnouncementTypeDto.UPDATE, userDsnpId.userDsnpId, updateDto, metadata);
  }

  @Delete(':userDsnpId')
  @ApiOperation({ summary: 'Delete DSNP Content for User' })
  @HttpCode(202)
  async delete(@Param() userDsnpId: DsnpUserIdParam, @Body() tombstoneDto: TombstoneDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeDto.TOMBSTONE, userDsnpId.userDsnpId, tombstoneDto);
  }
}
