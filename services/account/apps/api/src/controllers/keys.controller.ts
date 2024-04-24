import { Controller, Get, HttpCode, HttpStatus, Logger, Param, HttpException, Post, Body } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeysService } from '../services/keys.service';
import {
  AddKeysRequest,
  DeleteKeysRequest,
  KeysResponse,
  PublishKeysRequest,
} from '../../../../libs/common/src/types/dtos/keys.dto';
import { EnqueueService } from '../../../../libs/common/src/services/enqueue-request.service';
import { TransactionResponse, TransactionType } from '../../../../libs/common/src';

@Controller('keys')
@ApiTags('keys')
export class KeysController {
  private readonly logger: Logger;

  constructor(
    private keysService: KeysService,
    private enqueueService: EnqueueService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'add new control keys for an MSA ID' })
  @ApiOkResponse({ description: 'Found public keys.' })
  @ApiBody({ type: AddKeysRequest })
  /**
   * Gets public keys.
   * @param queryParams - The query parameters for getting the public keys.
   * @returns A promise that resolves to an array of public keys associated with the given msaId.
   * @throws An error if no public keys can be found.
   */
  async addKey(@Body() addKeysRequest: AddKeysRequest): Promise<TransactionResponse> {
    try {
      const response = await this.enqueueService.enqueueRequest<PublishKeysRequest>({
        ...addKeysRequest,
        type: TransactionType.ADD_KEY,
      });
      this.logger.log(`AddKey in progress. referenceId: ${response.referenceId}`);
      return response;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find public keys for the given msaId', HttpStatus.BAD_REQUEST);
    }
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
