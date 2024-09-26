import { ApiService } from '#graph-api/api.service';
import { WatchGraphsDto } from '#types/dtos/graph';
import { MsaIdDto, UrlDto } from '#types/dtos/common';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Body,
  Put,
  Res,
  HttpException,
  Get,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@Controller('v1/webhooks')
@ApiTags('v1/webhooks')
export class WebhooksControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all registered webhooks' })
  @ApiOkResponse({ description: 'Retrieved all registered webhooks' })
  async getAllWebhooks(): Promise<unknown> {
    return this.apiService.getAllWebhooks();
  }

  @Get('users/:msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all registered webhooks for a specific MSA Id' })
  @ApiOkResponse({ description: 'Retrieved all registered webhooks for the given MSA Id' })
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
  @ApiOkResponse({ description: 'Retrieved all webhooks registered to the specified URL' })
  async getWebhooksForUrl(@Query() { url }: UrlDto): Promise<string[]> {
    return this.apiService.getWatchedGraphsForUrl(url);
  }

  @Put()
  @ApiOperation({ summary: 'Watch graphs for specified dsnpIds and receive updates' })
  @ApiOkResponse({ description: 'Successfully started watching graphs' })
  @ApiBody({ type: WatchGraphsDto })
  async watchGraphs(@Body() watchGraphsDto: WatchGraphsDto, @Res() response: Response) {
    try {
      const hooksAdded = await this.apiService.watchGraphs(watchGraphsDto);
      response
        .status(hooksAdded ? HttpStatus.CREATED : HttpStatus.OK)
        .send({
          status: hooksAdded ? HttpStatus.CREATED : HttpStatus.OK,
          data: 'Successfully started watching graphs',
        })
        .end();
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to watch graphs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
