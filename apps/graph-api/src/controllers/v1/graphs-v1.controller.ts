import { ApiService } from '#graph-api/api.service';
import { ReadOnlyDeploymentGuard } from '#graph-api/guards/read-only-deployment-guard.service';
import { UserGraphDto, GraphsQueryParamsDto, GraphChangeResponseDto, ProviderGraphDto } from '#types/dtos/graph';
import { Controller, Post, HttpCode, HttpStatus, Logger, Body, Put, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'graphs' })
@ApiTags('v1/graphs')
export class GraphControllerV1 {
  constructor(
    private apiService: ApiService,
    @InjectPinoLogger(GraphControllerV1.name)
    private readonly logger: PinoLogger,
  ) {}

  // Fetch graphs for list of `dsnpIds` at optional `blockNumber`
  // TODO: Use HTTP QUERY method or GET with a body instead of POST (can then eliminate endpoint name, will just be GET /graph)
  @Post('getGraphs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch graphs for specified MSA Ids and Block Number' })
  @ApiOkResponse({ description: 'Graphs retrieved successfully', type: [UserGraphDto] })
  async getGraphs(@Body() queryParams: GraphsQueryParamsDto): Promise<UserGraphDto[]> {
    return this.apiService.getGraphs(queryParams);
  }

  // Enqueue a request to update a user graph
  @Put()
  @UseGuards(ReadOnlyDeploymentGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Request an update to a given user's graph" })
  @ApiCreatedResponse({ description: 'Graph update request created successfully', type: GraphChangeResponseDto })
  async updateGraph(@Body() providerGraphDto: ProviderGraphDto): Promise<GraphChangeResponseDto> {
    try {
      return await this.apiService.enqueueRequest(providerGraphDto);
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to update graph');
    }
  }
}
