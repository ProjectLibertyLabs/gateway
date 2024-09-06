/* eslint-disable class-methods-use-this */
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('health')
export class HealthController {
  // Health endpoint
  @Get('healthz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check the health status of the service' })
  @ApiOkResponse({ description: 'Service is healthy' })
  healthz() {
    return {
      status: HttpStatus.OK,
      message: 'Service is healthy',
    };
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
    return {
      status: HttpStatus.OK,
      message: 'Service is ready',
    };
  }
}
