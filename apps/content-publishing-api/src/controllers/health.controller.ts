import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheckService } from '#health-check/health-check.service';
import { HealthResponseDto } from '#types/dtos/common/health.response.dto';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';

@Controller()
@ApiTags('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    // eslint-disable-next-line no-empty-function
  ) {}

  // Health endpoint
  // eslint-disable-next-line class-methods-use-this
  @Get('healthz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check the health status of the service' })
  @ApiOkResponse({ description: 'Service is healthy' })
  async healthz(): Promise<HealthResponseDto> {
    return {
      status: HttpStatus.OK,
      message: 'Service is healthy',
      timestamp: Date.now(),
      config: this.healthCheckService.getServiceConfig('content-publishing-api'),
      queueStatus: await this.healthCheckService.getQueueStatus([
        QueueConstants.REQUEST_QUEUE_NAME,
        QueueConstants.ASSET_QUEUE_NAME,
        QueueConstants.PUBLISH_QUEUE_NAME,
        QueueConstants.BATCH_QUEUE_NAME,
      ]),
      blockchainStatus: await this.healthCheckService.getBlockchainStatus(),
    };
  }

  // Live endpoint
  // eslint-disable-next-line class-methods-use-this
  @Get('livez')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check the live status of the service' })
  @ApiOkResponse({ description: 'Service is live' })
  livez() {
    return {
      status: HttpStatus.OK,
      message: 'Service is live',
    };
  }

  // Ready endpoint
  // eslint-disable-next-line class-methods-use-this
  @Get('readyz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check the ready status of the service' })
  @ApiOkResponse({ description: 'Service is ready' })
  readyz() {
    return {
      status: HttpStatus.OK,
      message: 'Service is ready',
    };
  }
}
