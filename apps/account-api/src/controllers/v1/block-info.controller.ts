import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller('v1/frequency')
@ApiTags('v1/frequency')
export class BlockInfoController {
  constructor(
    @InjectPinoLogger(BlockInfoController.name) private readonly logger: PinoLogger,
  ) {}

  @Get('blockinfo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get information about the current block' })
  @ApiOkResponse({ description: 'Current block information' })
  async getBlockInfo() {
    this.logger.debug('Received request for block information');
    // Implementation will be added later
    return {
        blockNumber: 1,
        blockHash: '0x123',
        blockTimestamp: 1719436800,
        blockAuthor: '0x123',
        blockAuthorFee: 100,
        blockAuthorReward: 100,
    };
  }
} 