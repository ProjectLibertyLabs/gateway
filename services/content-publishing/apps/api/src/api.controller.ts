import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, ParseFilePipeBuilder, Post, Put, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
  AnnouncementResponseDto,
  AnnouncementTypeDto,
  BroadcastDto,
  DSNP_VALID_MIME_TYPES,
  DsnpContentHashParam,
  DsnpUserIdParam,
  FilesUploadDto,
  ProfileDto,
  ReactionDto,
  ReplyDto,
  UpdateDto,
  UploadResponseDto,
} from '../../../libs/common/src';
import { ApiService } from './api.service';

@Controller('api')
export class ApiController {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  // eslint-disable-next-line class-methods-use-this
  @Get('health')
  health() {
    return {
      status: HttpStatus.OK,
    };
  }

  @Put('asset/upload')
  @UseInterceptors(FilesInterceptor('files'))
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Asset files',
    type: FilesUploadDto,
  })
  async assetUpload(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: DSNP_VALID_MIME_TYPES,
        })
        .addMaxSizeValidator({
          // this is in bytes (2 GB)
          maxSize: 2 * 1000 * 1000 * 1000,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    files: // eslint-disable-next-line no-undef
    Array<Express.Multer.File>,
  ): Promise<UploadResponseDto> {
    this.logger.log(`upload ${files.length}`);
    return {
      assetIds: files.map((_) => uuidv4()),
    };
  }

  @Post('content/:userDsnpId/broadcast')
  @HttpCode(202)
  async broadcast(@Param() userDsnpId: DsnpUserIdParam, @Body() broadcastDto: BroadcastDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeDto.BROADCAST, userDsnpId.userDsnpId, broadcastDto);
  }

  @Post('content/:userDsnpId/reply')
  @HttpCode(202)
  async reply(@Param() userDsnpId: DsnpUserIdParam, @Body() replyDto: ReplyDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeDto.REPLY, userDsnpId.userDsnpId, replyDto);
  }

  @Post('content/:userDsnpId/reaction')
  @HttpCode(202)
  async reaction(@Param() userDsnpId: DsnpUserIdParam, @Body() reactionDto: ReactionDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeDto.REACTION, userDsnpId.userDsnpId, reactionDto);
  }

  @Put('content/:userDsnpId/:targetContentHash')
  @HttpCode(202)
  async update(@Param() userDsnpId: DsnpUserIdParam, @Param() targetContentHash: DsnpContentHashParam, @Body() updateDto: UpdateDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeDto.UPDATE, userDsnpId.userDsnpId, updateDto, targetContentHash.targetContentHash);
  }

  @Delete('content/:userDsnpId/:targetContentHash')
  @HttpCode(202)
  async delete(@Param() userDsnpId: DsnpUserIdParam, @Param() targetContentHash: DsnpContentHashParam): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeDto.TOMBSTONE, userDsnpId.userDsnpId, undefined, targetContentHash.targetContentHash);
  }

  @Put('profile/:userDsnpId')
  @HttpCode(202)
  async profile(@Param() userDsnpId: DsnpUserIdParam, @Body() profileDto: ProfileDto): Promise<AnnouncementResponseDto> {
    return this.apiService.enqueueRequest(AnnouncementTypeDto.PROFILE, userDsnpId.userDsnpId, profileDto);
  }
}
