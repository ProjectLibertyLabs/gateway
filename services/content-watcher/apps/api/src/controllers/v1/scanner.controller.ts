import { Body, Controller, Get, HttpException, HttpStatus, Logger, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiService } from '#api/api.service';
import { ResetScannerDto } from '@libs/common';
import { ChainWatchOptionsDto } from '@libs/common/dtos/chain.watch.dto';

@Controller('v1/scanner')
@ApiTags('v1/scanner')
export class ScanControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset blockchain scan to a specific block number or offset from the current position' })
  @ApiBody({
    description: 'blockNumber',
    type: ResetScannerDto,
  })
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
  @ApiOperation({ summary: 'Set watch options to filter the blockchain content scanner by schemas or MSA IDs' })
  @ApiBody({
    description: 'watchOptions: Filter contents by schemaIds and/or dsnpIds',
    type: ChainWatchOptionsDto,
  })
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
    description: 'immediate: whether to resume scan immediately (true), or wait until next scheduled scan (false)',
    type: 'boolean',
    required: false,
  })
  startScanner(@Query('immediate') immediate?: boolean) {
    this.logger.debug(`Resuming scan; immediate=${immediate}`);
    return this.apiService.resumeScanner(immediate);
  }
}
