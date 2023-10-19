import { Body, Controller, Delete, Get, HttpStatus, Logger, Post, Put } from '@nestjs/common';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { ApiService } from './api.service';
import { ResetScannerDto, ContentSearchRequestDto } from '../../../libs/common/src';
import { ChainWatchOptionsDto } from '../../../libs/common/src/dtos/chain.watch.dto';
import { WebhookRegistrationDto } from '../../../libs/common/src/dtos/subscription.webhook.dto';

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
  @ApiOkResponse({
    description: 'Returns a jobId to be used to retrieve the results',
    type: String,
  })
  async search(@Body() searchRequest: ContentSearchRequestDto) {
    const jobResult = await this.apiService.searchContent(searchRequest);

    return {
      status: HttpStatus.OK,
      jobId: jobResult.id,
    };
  }

  @Put('registerWebhook')
  @ApiBody({
    description: 'Register a webhook to be called when a new content is created',
    type: WebhookRegistrationDto,
  })
  async registerWebhook(@Body() webhookRegistrationDto: WebhookRegistrationDto) {
    this.logger.debug(`Registering webhook ${JSON.stringify(webhookRegistrationDto)}`);
    await this.apiService.setWebhook(webhookRegistrationDto);
    return {
      status: HttpStatus.OK,
    };
  }

  @Delete('clearAllWebHooks')
  async clearAllWebHooks() {
    this.logger.debug('Unregistering webhooks');
    await this.apiService.clearAllWebhooks();
    return {
      status: HttpStatus.OK,
    };
  }

  @Get('getRegisteredWebhooks')
  @ApiOkResponse({
    description: 'Returns a list of registered webhooks',
    type: [WebhookRegistrationDto],
  })
  async getRegisteredWebhooks() {
    this.logger.debug('Getting registered webhooks');
    const registeredWebhooks = await this.apiService.getRegisteredWebhooks();
    return {
      status: HttpStatus.OK,
      registeredWebhooks,
    };
  }
}
