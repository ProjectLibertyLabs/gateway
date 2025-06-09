import { ApiService } from '#graph-api/api.service';
import { WatchGraphsDto } from '#types/dtos/graph';
import { MsaIdDto, UrlDto } from '#types/dtos/common';
import { Controller, HttpCode, HttpStatus, Body, Put, Res, Get, Query, Delete, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { WebhookControllerV1 } from '#content-watcher/controllers';

@Controller({ version: '1', path: 'webhooks' })
@ApiTags('v1/webhooks')
export class WebhooksControllerV1 {
  constructor(
    private apiService: ApiService,
    @InjectPinoLogger(WebhookControllerV1.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all registered webhooks' })
  @ApiOkResponse({ description: 'Retrieved all registered webhooks' })
  async getAllWebhooks(): Promise<Record<string, string[]>> {
    return this.apiService.getAllWebhooks();
  }

  @Get('users/:msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all registered webhooks for a specific MSA Id' })
  @ApiOkResponse({ description: 'Retrieved all registered webhooks for the given MSA Id', type: [String] })
  @ApiQuery({
    name: 'includeAll',
    type: Boolean,
    example: true,
    required: false,
    description: "Boolean whether to include webhooks registered for 'all' MSA Ids (default: true)",
  })
  async getWebhooksForMsa(@Param() { msaId }: MsaIdDto, @Query('includeAll') includeAll = 'true'): Promise<string[]> {
    return this.apiService.getWebhooksForMsa(msaId, JSON.parse(includeAll ?? 'true'));
  }

  @Get('urls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all webhooks registered to the specified URL' })
  @ApiOkResponse({ description: 'Retrieved all watched MSA graphs registered to the specified URL', type: [String] })
  async getWebhooksForUrl(@Query() { url }: UrlDto): Promise<string[]> {
    return this.apiService.getWatchedGraphsForUrl(url);
  }

  @Put()
  @ApiOperation({ summary: 'Watch graphs for specified dsnpIds and receive updates' })
  @ApiOkResponse({ description: 'Successfully started watching graphs' })
  async watchGraphs(@Body() watchGraphsDto: WatchGraphsDto, @Res() response: Response) {
    const hooksAdded = await this.apiService.watchGraphs(watchGraphsDto);
    response
      .status(hooksAdded ? HttpStatus.CREATED : HttpStatus.OK)
      .send({
        status: hooksAdded ? HttpStatus.CREATED : HttpStatus.OK,
        data: 'Successfully started watching graphs',
      })
      .end();
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all registered webhooks' })
  @ApiOkResponse({ description: 'Removed all registered webhooks' })
  deleteAllWebhooks(): Promise<void> {
    return this.apiService.deleteAllWebhooks();
  }

  @Delete('users/:msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all webhooks registered for a specific MSA' })
  @ApiOkResponse({ description: 'Removed all registered webhooks for the specified MSA' })
  deleteWebhooksForMsa(@Param() { msaId }: MsaIdDto): Promise<void> {
    return this.apiService.deleteWebhooksForUser(msaId);
  }

  @Delete('urls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all MSA webhooks registered with the given URL' })
  @ApiOkResponse({ description: 'Removed all webhooks registered to the specified URL' })
  deleteAllWebhooksForUrl(@Query() { url }: UrlDto): Promise<void> {
    return this.apiService.deleteWebhooksForUrl(url);
  }
}
