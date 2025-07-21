import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheckService } from '#health-check/health-check.service';
import { HealthResponseDto } from '#types/dtos/common/health.response.dto';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';
import { IContentPublishingApiConfig } from '#content-publishing-api/api.config';

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
    const [configResult, redisResult, blockchainResult] = await Promise.allSettled([
      this.healthCheckService.getServiceConfig<IContentPublishingApiConfig>('content-publishing-api'),
      this.healthCheckService.getRedisStatus([
        QueueConstants.REQUEST_QUEUE_NAME,
        QueueConstants.ASSET_QUEUE_NAME,
        QueueConstants.PUBLISH_QUEUE_NAME,
        QueueConstants.BATCH_QUEUE_NAME,
      ]),
      this.healthCheckService.getBlockchainStatus(),
    ]);

    return {
      status: HttpStatus.OK,
      message: 'Service is healthy',
      timestamp: Date.now(),
      config: configResult.status === 'fulfilled' ? configResult.value : null,
      redisStatus: redisResult.status === 'fulfilled' ? redisResult.value : null,
      blockchainStatus: blockchainResult.status === 'fulfilled' ? blockchainResult.value : null,
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
