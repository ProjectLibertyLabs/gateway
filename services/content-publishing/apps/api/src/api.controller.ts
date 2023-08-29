import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, ParseFilePipeBuilder, Post, Put, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
  BroadcastDto,
  ReactionDto,
  ReplyDto,
  UpdateDto,
  ProfileDto,
  AnnouncementResponseDto,
  FilesUploadDto,
  UploadResponseDto,
  DsnpUserIdParam,
  DsnpContentHashParam,
} from '../../../libs/common/src';
import { DSNP_VALID_MIME_TYPES } from '../../../libs/common/src/constants';

@Controller('api')
export class ApiController {
  private readonly logger: Logger;

  constructor() {
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
    this.logger.log(`broadcast ${userDsnpId}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Post('content/:userDsnpId/reply')
  @HttpCode(202)
  async reply(@Param() userDsnpId: DsnpUserIdParam, @Body() replyDto: ReplyDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`reply ${userDsnpId}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Post('content/:userDsnpId/reaction')
  @HttpCode(202)
  async reaction(@Param() userDsnpId: DsnpUserIdParam, @Body() reactionDto: ReactionDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`reaction ${userDsnpId}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Put('content/:userDsnpId/:targetContentHash')
  @HttpCode(202)
  async update(@Param() userDsnpId: DsnpUserIdParam, @Param() targetContentHash: DsnpContentHashParam, @Body() updateDto: UpdateDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`update ${userDsnpId}/${targetContentHash}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Delete('content/:userDsnpId/:targetContentHash')
  @HttpCode(202)
  async delete(@Param() userDsnpId: DsnpUserIdParam, @Param() targetContentHash: DsnpContentHashParam): Promise<AnnouncementResponseDto> {
    this.logger.log(`delete ${userDsnpId}/${targetContentHash}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Put('profile/:userDsnpId')
  @HttpCode(202)
  async profile(@Param() userDsnpId: DsnpUserIdParam, @Body() profileDto: ProfileDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`profile ${userDsnpId}`);
    return {
      referenceId: uuidv4(),
    };
  }
}
