import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, ParseFilePipeBuilder, Post, Put, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ApiService } from './api.service';
import {
  AnnouncementTypeDto,
  AssetIncludedRequestDto,
  BroadcastDto,
  DSNP_VALID_MIME_TYPES,
  DsnpUserIdParam,
  ProfileDto,
  ReactionDto,
  ReplyDto,
  TombstoneDto,
  UpdateDto,
  ResetScannerDto,
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
  @ApiBody({
    description: 'blockNumber',
    type: ResetScannerDto,
  })
  resetScanner(@Body() resetScannerDto: ResetScannerDto) {
    return this.apiService.setLastSeenBlockNumber(BigInt(resetScannerDto.blockNumber?? 0n));
  }
}
