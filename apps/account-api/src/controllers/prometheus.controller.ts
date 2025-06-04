import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as client from 'prom-client';

@Controller()
@ApiTags('prometheus')
export class PrometheusController {
  private readonly collectDefaultMetrics = client.collectDefaultMetrics;

  // Prometheus metrics endpoint
  // eslint-disable-next-line class-methods-use-this
  @Get('prometheus')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prometheus endpoint' })
  @ApiOkResponse({ description: 'Prometheus returned metrics' })
  async prometheus() {
    this.collectDefaultMetrics();
    const metrics = await client.register.metrics();
    return {
      status: HttpStatus.OK,
      message: metrics,
    };
  }
}
