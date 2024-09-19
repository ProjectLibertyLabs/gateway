import { KeysService } from '#account-api/services/keys.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { TransactionType } from '#types/enums/account-enums';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  HttpException,
  Body,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeysRequestDto, AddKeyRequestDto } from '#types/dtos/account/keys.request.dto';
import { TransactionResponse } from '#types/dtos/account/transaction.response.dto';
import { KeysResponse } from '#types/dtos/account/keys.response.dto';
import { ReadOnlyGuard } from '#account-api/guards/read-only.guard';
import {
  AddNewPublicKeyAgreementPayloadRequest,
  AddNewPublicKeyAgreementRequestDto,
  PublicKeyAgreementRequestDto,
  PublicKeyAgreementsKeyPayload,
} from '#types/dtos/account/graphs.request.dto';
import { MsaIdDto } from '#types/dtos/common';

@Controller('v1/keys')
@ApiTags('v1/keys')
@UseGuards(ReadOnlyGuard) // Apply guard at the controller level
export class KeysControllerV1 {
  private readonly logger: Logger;

  constructor(
    private keysService: KeysService,
    private enqueueService: EnqueueService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add new control keys for an MSA Id' })
  @ApiOkResponse({ description: 'Found public keys' })
  @ApiBody({ type: KeysRequestDto })
  /**
   * Add new control keys for an MSA Id.
   * @param queryParams - The query parameters for adding the public keys.
   * @returns A promise that resolves to an array of public keys associated with the given msaId.
   * @throws An error if no public keys can be found.
   */
  async addKey(@Body() addKeysRequest: KeysRequestDto): Promise<TransactionResponse> {
    try {
      const response = await this.enqueueService.enqueueRequest<AddKeyRequestDto>({
        ...addKeysRequest,
        type: TransactionType.ADD_KEY,
      });
      this.logger.log(`AddKey in progress. referenceId: ${response.referenceId}`);
      return response;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find public keys for the given MSA Id', HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch public keys given an MSA Id' })
  @ApiOkResponse({ description: 'Found public keys' })
  /**
   * Gets public keys.
   * @param queryParams - The query parameters for getting the public keys.
   * @returns A promise that resolves to an array of public keys associated with the given msaId.
   * @throws An error if no public keys can be found.
   */
  async getKeys(@Param() { msaId }: MsaIdDto): Promise<KeysResponse> {
    try {
      const keys = await this.keysService.getKeysByMsa(msaId);
      return keys;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Failed to find public keys for the given msaId', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('publicKeyAgreements/getAddKeyPayload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a properly encoded StatefulStorageItemizedSignaturePayloadV2 that can be signed.' })
  @ApiOkResponse({ description: 'Returned an encoded StatefulStorageItemizedSignaturePayloadV2 for signing' })
  /**
   * Using the provided query parameters, creates a new payload that can be signed to add new graph keys.
   * @param queryParams - The query parameters for adding a new key
   * @returns Payload is included for convenience. Encoded payload to be used when signing the transaction.
   * @throws An error if the key already exists or the payload creation fails.
   */
  async getPublicKeyAgreementsKeyPayload(
    @Query() { msaId, newKey }: PublicKeyAgreementsKeyPayload,
  ): Promise<AddNewPublicKeyAgreementPayloadRequest> {
    return this.keysService.getAddPublicKeyAgreementPayload(msaId, newKey);
  }

  @Post('publicKeyAgreements')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to add a new public Key' })
  @ApiOkResponse({ description: 'Add new key request enqueued' })
  @ApiBody({ type: AddNewPublicKeyAgreementRequestDto })
  /**
   * Using the provided query parameters, adds a new public key for the account
   * @param queryParams - The query parameters for adding a new graph key
   * @returns A message that the adding  anew graph key operation is in progress.
   * @throws An error if enqueueing the operation fails.
   */
  async AddNewPublicKeyAgreements(@Body() request: AddNewPublicKeyAgreementRequestDto): Promise<TransactionResponse> {
    try {
      const response = await this.enqueueService.enqueueRequest<PublicKeyAgreementRequestDto>({
        ...request,
        type: TransactionType.ADD_PUBLIC_KEY_AGREEMENT,
      });
      this.logger.log(`Add graph key in progress. referenceId: ${response.referenceId}`);
      return response;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to add new key');
    }
  }
}
