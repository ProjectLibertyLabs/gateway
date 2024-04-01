import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiService } from '../services/api.service';

@Controller('api')
@ApiTags('account-service')
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

  // // Create a provider graph
  // @Post('update-graph')
  // @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({ summary: 'Request an update to given users graph' })
  // @ApiCreatedResponse({ description: 'Graph update request created successfully', type: GraphChangeRepsonseDto })
  // @ApiBody({ type: ProviderGraphDto })
  // async updateGraph(@Body() providerGraphDto: ProviderGraphDto): Promise<GraphChangeRepsonseDto> {
  //   try {
  //     return await this.apiService.enqueueRequest(providerGraphDto);
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw new Error('Failed to update graph');
  //   }
  // }

  // @Put('watch-graphs')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Watch graphs for specified dsnpIds and receive updates' })
  // @ApiOkResponse({ description: 'Successfully started watching graphs' })
  // @ApiBody({ type: WatchGraphsDto })
  // async watchGraphs(@Body() watchGraphsDto: WatchGraphsDto) {
  //   try {
  //     // eslint-disable-next-line no-await-in-loop
  //     await this.apiService.watchGraphs(watchGraphsDto);
  //     return {
  //       status: HttpStatus.OK,
  //       data: 'Successfully started watching graphs',
  //     };
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw new Error('Failed to watch graphs');
  //   }
  // }
}
