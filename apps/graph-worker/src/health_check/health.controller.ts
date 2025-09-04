import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheckService } from '#health-check/health-check.service';
import { HealthResponseDto } from '#types/dtos/common/health.response.dto';

@Controller()
@ApiTags('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  // Health endpoint

  @Get('healthz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check the health status of the service' })
  @ApiOkResponse({ description: 'Service is healthy' })
  async healthz(): Promise<HealthResponseDto> {
    return this.healthCheckService.getServiceStatus();
  }

  // Live endpoint

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

  @Get('readyz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check the ready status of the service' })
  @ApiOkResponse({ description: 'Service is ready' })
  readyz() {
    return this.healthCheckService.getServiceReadiness();
  }
}
