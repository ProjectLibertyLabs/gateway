import { ApiService } from '#api/services/api.service';
import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('api')
@ApiTags('api')
export class ApiController {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  // Health endpoint
  // eslint-disable-next-line class-methods-use-this
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check the health status of the service' })
  @ApiOkResponse({ description: 'Service is healthy' })
  health() {
    return {
      status: HttpStatus.OK,
      message: 'Service is healthy',
    };
  }
}
