import { KeysService } from '#api/services/keys.service';
import { EnqueueService } from '#lib/services/enqueue-request.service';
import { TransactionType } from '#lib/types/enums';
import { Controller, Get, HttpCode, HttpStatus, Logger, Param, HttpException, Body, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeysRequest, AddKeyRequest } from '#lib/types/dtos/keys.request.dto';
import { TransactionResponse } from '#lib/types/dtos/transaction.response.dto';
import { KeysResponse } from '#lib/types/dtos/keys.response.dto';

@Controller('v1/keys')
@ApiTags('v1/keys')
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
  @ApiBody({ type: KeysRequest })
  /**
   * Add new control keys for an MSA ID.
   * @param queryParams - The query parameters for adding the public keys.
   * @returns A promise that resolves to an array of public keys associated with the given msaId.
   * @throws An error if no public keys can be found.
   */
  async addKey(@Body() addKeysRequest: KeysRequest): Promise<TransactionResponse> {
    try {
      const response = await this.enqueueService.enqueueRequest<AddKeyRequest>({
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
  async getKeys(@Param('msaId') msaId: string): Promise<KeysResponse> {
    try {
      const keys = await this.keysService.getKeysByMsa(msaId);
      return keys;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find public keys for the given msaId', HttpStatus.BAD_REQUEST);
    }
  }
}
