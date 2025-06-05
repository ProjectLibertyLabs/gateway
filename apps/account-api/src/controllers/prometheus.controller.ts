import { Controller, Get, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics();

@Controller()
@ApiTags('metrics')
export class PrometheusController {
  // Prometheus metrics endpoint
  // eslint-disable-next-line class-methods-use-this
  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', register.contentType)
  @ApiOperation({ summary: 'Prometheus endpoint' })
  @ApiOkResponse({ description: 'Prometheus returned metrics' })
  async metrics() {
    return register.metrics();
  }
}
