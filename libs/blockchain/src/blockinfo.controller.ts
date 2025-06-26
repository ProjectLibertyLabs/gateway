import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';

@Controller({ version: '1', path: 'frequency' })
@ApiTags('/v1/frequency')
export class BlockInfoController {
  constructor(private blockchainService: BlockchainRpcQueryService) {}

  // BlockInfo endpoint
  // eslint-disable-next-line class-methods-use-this
  @Get('blockinfo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get information about current block' })
  @ApiOkResponse({ description: 'Block information retrieved successfully' })
  async blockInfo() {
    return {
      status: HttpStatus.OK,
      message: 'Block information retrieved successfully',
      data: await this.blockchainService.getCurrentBlockInfo(),
    };
  }
}
