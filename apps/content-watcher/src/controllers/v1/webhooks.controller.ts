import { ApiService } from '#content-watcher/api.service';
import {
  WebhookRegistrationDto,
  WebhookRegistrationResponseDto,
} from '#types/dtos/content-watcher/subscription.webhook.dto';
import { Body, Controller, Delete, Get, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'webhooks' })
@ApiTags('v1/webhooks')
export class WebhookControllerV1 {
  constructor(
    private apiService: ApiService,
    @InjectPinoLogger(WebhookRegistrationDto.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a webhook to be called when new content is encountered on the chain' })
  async registerWebhook(@Body() webhookRegistrationDto: WebhookRegistrationDto) {
    this.logger.debug(`Registering webhook ${JSON.stringify(webhookRegistrationDto)}`);
    await this.apiService.setWebhook(webhookRegistrationDto);
    return {
      status: HttpStatus.OK,
    };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all previously registered webhooks' })
  async clearAllWebHooks() {
    this.logger.debug('Unregistering webhooks');
    await this.apiService.clearAllWebhooks();
    return {
      status: HttpStatus.OK,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get the list of currently registered webhooks' })
  @ApiOkResponse({
    description: 'Returns a list of registered webhooks',
    type: WebhookRegistrationResponseDto,
  })
  async getRegisteredWebhooks(): Promise<WebhookRegistrationResponseDto> {
    this.logger.debug('Getting registered webhooks');
    const registeredWebhooks = (await this.apiService.getRegisteredWebhooks()) as WebhookRegistrationDto[];
    return {
      status: HttpStatus.OK,
      registeredWebhooks,
    };
  }
}
