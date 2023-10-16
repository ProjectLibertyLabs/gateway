import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, ParseFilePipeBuilder, Post, Put, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ApiService } from './api.service';
import {
  AnnouncementResponseDto,
  AnnouncementTypeDto,
  AssetIncludedRequestDto,
  BroadcastDto,
  DSNP_VALID_MIME_TYPES,
  DsnpUserIdParam,
  FilesUploadDto,
  ProfileDto,
  ReactionDto,
  ReplyDto,
  TombstoneDto,
  UpdateDto,
  UploadResponseDto,
} from '../../../libs/common/src';

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

  @Post('resetScanner')
  resetScanner(@Body() body: { blockNumber?: bigint }) {
    return this.apiService.setLastSeenBlockNumber(body.blockNumber ?? 0n);
  }
}
