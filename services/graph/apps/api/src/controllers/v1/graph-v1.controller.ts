import { ApiService } from '#api/api.service';
import { UserGraphDto, GraphsQueryParamsDto, GraphChangeRepsonseDto, ProviderGraphDto } from '#lib';
import { Controller, Post, HttpCode, HttpStatus, Logger, Body, Put } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('v1/graphs')
@ApiTags('v1/graphs')
export class GraphControllerV1 {
  private readonly logger: Logger;

  constructor(private apiService: ApiService) {
    this.logger = new Logger(this.constructor.name);
  }

  // Fetch graphs for list of `dsnpIds` at optional `blockNumber`
  // TODO: Use HTTP QUERY method or GET with a body instead of POST (can then eliminate endpoint name, will just be GET /graph)
  @Post('getGraphs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch graphs for specified dsnpIds and blockNumber' })
  @ApiOkResponse({ description: 'Graphs retrieved successfully', type: [UserGraphDto] })
  async getGraphs(@Body() queryParams: GraphsQueryParamsDto): Promise<UserGraphDto[]> {
    try {
      const graphs = await this.apiService.getGraphs(queryParams);
      return graphs;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to fetch graphs');
    }
  }

  // Enqueue a request to update a user graph
  @Put()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request an update to given users graph' })
  @ApiCreatedResponse({ description: 'Graph update request created successfully', type: GraphChangeRepsonseDto })
  @ApiBody({ type: ProviderGraphDto })
  async updateGraph(@Body() providerGraphDto: ProviderGraphDto): Promise<GraphChangeRepsonseDto> {
    try {
      return await this.apiService.enqueueRequest(providerGraphDto);
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to update graph');
    }
  }
}
