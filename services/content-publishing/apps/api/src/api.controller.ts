import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Post, Put, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { BroadcastDto, ReactionDto, ReplyDto, UpdateDto, ProfileDto, AnnouncementResponseDto, FilesUploadDto, UploadResponseDto } from '../../../libs/common/src';

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
  // eslint-disable-next-line no-undef
  async assetUpload(@UploadedFiles() files: Array<Express.Multer.File>): Promise<UploadResponseDto> {
    this.logger.log(`upload ${files.length}`);
    return {
      assetIds: files.map((_) => uuidv4()),
    };
  }

  @Post('content/:userDsnpId/broadcast')
  @HttpCode(202)
  async broadcast(@Param('userDsnpId') userDsnpId: string, @Body() broadcastDto: BroadcastDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`broadcast ${userDsnpId}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Post('content/:userDsnpId/reply')
  @HttpCode(202)
  async reply(@Param('userDsnpId') userDsnpId: string, @Body() replyDto: ReplyDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`reply ${userDsnpId}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Post('content/:userDsnpId/reaction')
  @HttpCode(202)
  async reaction(@Param('userDsnpId') userDsnpId: string, @Body() reactionDto: ReactionDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`reaction ${userDsnpId}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Put('content/:userDsnpId/:targetContentHash')
  @HttpCode(202)
  async update(@Param('userDsnpId') userDsnpId: string, @Param('targetContentHash') targetContentHash: string, @Body() updateDto: UpdateDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`update ${userDsnpId}/${targetContentHash}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Delete('content/:userDsnpId/:targetContentHash')
  @HttpCode(202)
  async delete(@Param('userDsnpId') userDsnpId: string, @Param('targetContentHash') targetContentHash: string): Promise<AnnouncementResponseDto> {
    this.logger.log(`delete ${userDsnpId}/${targetContentHash}`);
    return {
      referenceId: uuidv4(),
    };
  }

  @Put('profile/:userDsnpId')
  @HttpCode(202)
  async profile(@Param('userDsnpId') userDsnpId: string, @Body() profileDto: ProfileDto): Promise<AnnouncementResponseDto> {
    this.logger.log(`profile ${userDsnpId}`);
    return {
      referenceId: uuidv4(),
    };
  }
}
