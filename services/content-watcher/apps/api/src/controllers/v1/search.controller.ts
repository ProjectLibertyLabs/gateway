/* eslint-disable class-methods-use-this */
import { ApiService } from '#api/api.service';
import { ContentSearchRequestDto } from '@libs/common';
import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('v1/search')
@ApiTags('v1/search')
export class SearchControllerV1 {
  constructor(private readonly apiService: ApiService) {}

  @Post()
  @ApiOperation({ summary: 'Search for DSNP content by id, start/end block, and filters' })
  @ApiBody({
    description: 'Search for DSNP content by id, startBlock, endBlock, and filters',
    type: ContentSearchRequestDto,
  })
  @ApiOkResponse({
    description: 'Returns a jobId to be used to retrieve the results',
    type: String,
  })
  async search(@Body() searchRequest: ContentSearchRequestDto) {
    const jobResult = await this.apiService.searchContent(searchRequest);

    return {
      status: HttpStatus.OK,
      jobId: jobResult.id,
    };
  }
}
