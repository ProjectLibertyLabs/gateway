import { Body, Controller, Get, HttpStatus, Logger, Post, Put } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { ApiService } from './api.service';
import {
  ResetScannerDto,
  ContentSearchRequestDto,
} from '../../../libs/common/src';
import { ChainWatchOptionsDto } from '../../../libs/common/src/dtos/chain.watch.dto';

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
    return this.apiService.setLastSeenBlockNumber(BigInt(resetScannerDto.blockNumber ?? 0n));
  }

  @Post('setWatchOptions')
  @ApiBody({
    description: 'watchOptions: Filter contents by schemaIds and/or dsnpIds',
    type: ChainWatchOptionsDto,
  })
  setWatchOptions(@Body() watchOptions: ChainWatchOptionsDto) {
    return this.apiService.setWatchOptions(watchOptions);
  }

  @Post('pauseScanner')
  pauseScanner() {
    return this.apiService.pauseScanner();
  }

  @Post('startScanner')
  startScanner() {
    return this.apiService.resumeScanner();
  }

  @Put('search')
  @ApiBody({
    description: 'Search for DSNP content by id, startBlock, endBlock, and filters',
    type: ContentSearchRequestDto,
  })
  async search(@Body() searchRequest: ContentSearchRequestDto) {
    const jobResult = await this.apiService.searchContent(searchRequest);

    return {
      status: HttpStatus.OK,
      jobId: jobResult.id,
    };
  }
}
