import { Body, Controller, Get, HttpException, HttpStatus, Logger, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiService } from '#content-watcher/api.service';
import { ResetScannerDto } from '#types/dtos/content-watcher';
import { ChainWatchOptionsDto } from '#types/dtos/content-watcher/chain.watch.dto';

@Controller('v1/scanner')
@ApiTags('v1/scanner')
export class ScanControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset blockchain scan to a specific block number or offset from the current position' })
  resetScanner(@Body() resetScannerDto: ResetScannerDto) {
    return this.apiService.resetScanner(resetScannerDto);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get the current watch options for the blockchain content event scanner' })
  async getWatchOptions(): Promise<ChainWatchOptionsDto> {
    const options = await this.apiService.getWatchOptions();
    if (!options) {
      throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    }

    return options;
  }

  @Post('options')
  @ApiOperation({ summary: 'Set watch options to filter the blockchain content scanner by schemas or MSA Ids' })
  setWatchOptions(@Body() watchOptions: ChainWatchOptionsDto) {
    return this.apiService.setWatchOptions(watchOptions);
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause the blockchain scanner' })
  pauseScanner() {
    return this.apiService.pauseScanner();
  }

  @Post('start')
  @ApiOperation({ summary: 'Resume the blockchain content event scanner' })
  @ApiQuery({
    name: 'immediate',
    description: 'Immediate: whether to resume scan immediately (true), or wait until next scheduled scan (false)',
    type: 'boolean',
    required: false,
  })
  startScanner(@Query('immediate') immediate?: boolean) {
    this.logger.debug(`Resuming scan; immediate=${immediate}`);
    return this.apiService.resumeScanner(immediate);
  }
}
