import { Controller, Get, Post, HttpCode, HttpStatus, Logger, Query, Body, Put } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiService } from './api.service';
import { GraphsQueryParamsDto, ProviderGraphDto, UserGraphDto } from '../../../libs/common/src';
import { WatchGraphsDto } from '../../../libs/common/src/dtos/watch-graphs.dto';

@Controller('api')
@ApiTags('graph-service')
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

  // Fetch graphs for list of `dsnpIds` at optional `blockNumber`
  // Fetch graphs for list of `dsnpIds` at optional `blockNumber`
  @Get('graphs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch graphs for specified dsnpIds and blockNumber' })
  @ApiOkResponse({ description: 'Graphs retrieved successfully', type: UserGraphDto })
  async getGraphs(@Query() queryParams: GraphsQueryParamsDto): Promise<UserGraphDto[]> {
    try {
      // TODO: Uncomment this line once the ApiService is implemented
      // const graphs = await this.apiService.getGraphs(queryParams.dsnpIds, queryParams.blockNumber);

      // For now, returning a dummy response
      const dummyGraph: UserGraphDto = {
        dsnpId: 'sampleDsnpId',
        dsnpGraphEdge: [],
      };

      return [dummyGraph];
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to fetch graphs');
    }
  }

  // Create a provider graph
  @Post('update-graph')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request an update to given users graph' })
  @ApiCreatedResponse({ description: 'Successfully queued job to update user graph' })
  @ApiBody({ type: ProviderGraphDto })
  async updateGraph(@Body() providerGraphDto: ProviderGraphDto) {
    try {
      // TODO: Uncomment this line once the ApiService is implemented
      // const result = await this.apiService.updateGraph(providerGraphDto);
      return {
        status: HttpStatus.CREATED,
        data: 'Successfully queued job to update user graph',
      };
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to update graph');
    }
  }

  @Put('watch-graphs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Watch graphs for specified dsnpIds and receive updates' })
  @ApiOkResponse({ description: 'Successfully started watching graphs' })
  @ApiBody({ type: WatchGraphsDto })
  async watchGraphs(@Body() watchGraphsDto: WatchGraphsDto) {
    try {
      // TODO: Uncomment this line once the ApiService is implemented
      // const result = await this.apiService.watchGraphs(watchGraphsDto);
      return {
        status: HttpStatus.OK,
        data: 'Successfully started watching graphs',
      };
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to watch graphs');
    }
  }
}
