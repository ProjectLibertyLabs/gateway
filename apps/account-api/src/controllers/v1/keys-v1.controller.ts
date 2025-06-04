import { KeysService } from '#account-api/services/keys.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Body,
  Post,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { TransactionType } from '#types/account-webhook';
import { MsaIdDto } from '#types/dtos/common';
import { PinoLogger } from 'nestjs-pino';

@Controller({ version: '1', path: 'keys' })
@ApiTags('v1/keys')
@UseGuards(ReadOnlyGuard) // Apply guard at the controller level
export class KeysControllerV1 {
  private readonly logger: PinoLogger;

  constructor(
    private keysService: KeysService,
    private enqueueService: EnqueueService,
  ) {
    // this.logger.setContext(this.constructor.name);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add new control keys for an MSA Id' })
  @ApiOkResponse({ description: 'Found public keys', type: TransactionResponse })
  /**
   * Add new control keys for an MSA Id.
   * @param queryParams - The query parameters for adding the public keys.
   * @returns A promise that resolves to an array of public keys associated with the given msaId.
   * @throws An error if no public keys can be found.
   */
  async addKey(@Body() addKeysRequest: KeysRequestDto): Promise<TransactionResponse> {
    if (!this.keysService.verifyAddKeySignature(addKeysRequest)) {
      throw new BadRequestException('Provided signature is not valid for the payload!');
    }
    const response = await this.enqueueService.enqueueRequest<AddKeyRequestDto>({
      ...addKeysRequest,
      type: TransactionType.ADD_KEY,
    });
    this.logger.info(`AddKey in progress. referenceId: ${response.referenceId}`);
    return response;
  }

  @Get(':msaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch public keys given an MSA Id' })
  @ApiOkResponse({ description: 'Found public keys', type: KeysResponse })
  /**
   * Gets public keys.
   * @param queryParams - The query parameters for getting the public keys.
   * @returns A promise that resolves to an array of public keys associated with the given msaId.
   * @throws An error if no public keys can be found.
   */
  async getKeys(@Param() { msaId }: MsaIdDto): Promise<KeysResponse> {
    return this.keysService.getKeysByMsa(msaId);
  }

  @Get('publicKeyAgreements/getAddKeyPayload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a properly encoded StatefulStorageItemizedSignaturePayloadV2 that can be signed.' })
  @ApiOkResponse({
    description: 'Returned an encoded StatefulStorageItemizedSignaturePayloadV2 for signing',
    type: AddNewPublicKeyAgreementPayloadRequest,
  })
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
  @ApiOkResponse({ description: 'Add new key request enqueued', type: TransactionResponse })
  /**
   * Using the provided query parameters, adds a new public key for the account
   * @param queryParams - The query parameters for adding a new graph key
   * @returns A message that the adding  anew graph key operation is in progress.
   * @throws An error if enqueueing the operation fails.
   */
  async AddNewPublicKeyAgreements(@Body() request: AddNewPublicKeyAgreementRequestDto): Promise<TransactionResponse> {
    if (!this.keysService.verifyPublicKeyAgreementSignature(request)) {
      throw new BadRequestException('Proof is not valid for the payload!');
    }
    const response = await this.enqueueService.enqueueRequest<PublicKeyAgreementRequestDto>({
      ...request,
      type: TransactionType.ADD_PUBLIC_KEY_AGREEMENT,
    });
    this.logger.info(`Add graph key in progress. referenceId: ${response.referenceId}`);
    return response;
  }
}
