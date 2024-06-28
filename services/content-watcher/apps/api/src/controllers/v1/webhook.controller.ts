import { ApiService } from '#api/api.service';
import { WebhookRegistrationDto } from '@libs/common/dtos/subscription.webhook.dto';
import { Body, Controller, Delete, Get, HttpStatus, Logger, Put } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('v1/webhooks')
@ApiTags('v1/webhooks')
export class WebhookControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Put()
  @ApiOperation({ summary: 'Register a webhook to be called when new content is encountered on the chain' })
  @ApiBody({
    description: 'Register a webhook to be called when a new content is encountered',
    type: WebhookRegistrationDto,
  })
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
