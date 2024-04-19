import { Controller, Get, HttpCode, HttpStatus, Logger, Param, HttpException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeysService } from '../services/keys.service';
import { KeysResponse } from '../../../../libs/common/src/types/dtos/keys.dto';

@Controller('keys')
@ApiTags('keys')
export class KeysController {
  private readonly logger: Logger;

  constructor(private keysService: KeysService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch public keys given an msaId.' })
  @ApiOkResponse({ description: 'Found public keys.' })
  /**
   * Gets public keys.
   * @param queryParams - The query parameters for getting the public keys.
   * @returns A promise that resolves to an array of public keys associated with the given msaId.
   * @throws An error if no public keys can be found.
   */
  async getKeys(@Param('msaId') msaId: number): Promise<KeysResponse> {
    try {
      const keys = await this.keysService.getKeysByMsa(msaId);
      return keys;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find public keys for the given msaId', HttpStatus.BAD_REQUEST);
    }
  }
}
