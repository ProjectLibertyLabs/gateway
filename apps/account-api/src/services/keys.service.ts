import { KeysResponse } from '#types/dtos/account/keys.response.dto';
import { ConflictException, Inject, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { HexString } from '@polkadot/util/types';
import { hexToU8a } from '@polkadot/util';
import {
  AddNewPublicKeyAgreementPayloadRequest,
  AddNewPublicKeyAgreementRequestDto,
  ItemActionDto,
  ItemizedSignaturePayloadDto,
} from '#types/dtos/account/graphs.request.dto';
import { ItemActionType } from '#types/enums/item-action-type.enum';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';
import * as BlockchainConstants from '#types/constants/blockchain-constants';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { KeysRequestDto, KeysRequestPayloadDto } from '#types/dtos/account';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import {
  getKeypairTypeFromRequestAddress,
  SignatureVerificationResult,
  verifySignature,
} from '#utils/common/signature.util';
import {
  createAddKeyData as createEthereumAddKeyData,
  createItemizedAddAction,
  createItemizedDeleteAction,
  createItemizedSignaturePayloadV2,
  ItemizedAction,
  verifySignature as verifyEthereumSignature,
} from '@frequency-chain/ethereum-utils';
import { PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { HOUR, MILLISECONDS_PER_SECOND } from 'time-constants';
import IcsApi from '@projectlibertylabs-ics/ics-sdk';
const icsSdk: IcsApi = new IcsApi();


const SCHEMA_ID_TTL = HOUR / MILLISECONDS_PER_SECOND; // 1 hour in seconds
const GRAPH_KEY_SCHEMA_ID_CACHE_KEY = 'graphKeySchemaId';
const ICS_KEY_SCHEMA_ID_CACHE_KEY = 'icsKeySchemaId';

@Injectable()
export class KeysService implements OnApplicationBootstrap {
  private graphKeyIntentId: number;
  private icsKeyIntentId: number;

  async onApplicationBootstrap() {
    try {
      const { intentId, schemaId } = await this.blockchainService.getIntentAndLatestSchemaIdsByName(
        'dsnp',
        'public-key-key-agreement',
      );
      this.graphKeyIntentId = intentId;

      const { intentId: icsIntentId, schemaId: icsSchemaId } = await this.blockchainService.getIntentAndLatestSchemaIdsByName(
        'ics',
        'public-key-key-agreement',
      )
      this.icsKeyIntentId = icsIntentId;
      // Set 1-hour TTL on this so that we don't need to restart if a new schema is published
      await this.cache.setex(GRAPH_KEY_SCHEMA_ID_CACHE_KEY, SCHEMA_ID_TTL, schemaId);
      await this.cache.setex(ICS_KEY_SCHEMA_ID_CACHE_KEY, SCHEMA_ID_TTL, icsSchemaId);
    } catch (e: any) {
      this.logger.fatal({ error: e }, 'Unable to resolve intent ID for one of the key agreements');
      this.emitter.emit('shutdown');
    }
  }

  constructor(
    @Inject(apiConfig.KEY) private readonly apiConf: IAccountApiConfig,
    @InjectRedis() private readonly cache: Redis,
    private blockchainService: BlockchainRpcQueryService,
    private readonly logger: PinoLogger,
    private readonly emitter: EventEmitter2,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async getKeysByMsa(msaId: string): Promise<KeysResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const keyInfoResponse = await this.blockchainService.getKeysByMsa(msaId);
      if (keyInfoResponse) {
        this.logger.debug('Successfully found keys.');
        return { msaKeys: keyInfoResponse.msa_keys };
      }
    }
    throw new NotFoundException(`Keys not found for ${msaId}`);
  }

  private async getGraphSchemaId(): Promise<number> {
    let schemaId = Number(await this.cache.get('graphKeySchemaId'));
    if (isNaN(schemaId) || schemaId <= 0) {
      schemaId = await this.blockchainService.getLatestSchemaIdForIntent(this.graphKeyIntentId);
      // Set 1-hour TTL on this so that we don't need to restart if a new schema is published
      await this.cache.setex(GRAPH_KEY_SCHEMA_ID_CACHE_KEY, SCHEMA_ID_TTL, schemaId);
    }

    return schemaId;
  }

  async getAddPublicKeyAgreementPayload(
    msaId: string,
    newKey: HexString,
  ): Promise<AddNewPublicKeyAgreementPayloadRequest> {
    const expiration = await this.getExpiration();

    const schemaId = await this.blockchainService.getLatestSchemaIdForIntent(this.graphKeyIntentId);

    const itemizedStorage = await this.blockchainService.getItemizedStorage(msaId, this.graphKeyIntentId);
    if (
      itemizedStorage.items
        .toArray()
        .find((i) => i.payload.length > 0 && u8aToHex(i.payload).toLowerCase() === newKey.toLowerCase())
    ) {
      throw new ConflictException('Requested key already exists!');
    }
    const payload: ItemizedSignaturePayloadDto = {
      expiration,
      schemaId,
      targetHash: itemizedStorage.content_hash.toNumber(),
      actions: [
        {
          type: ItemActionType.ADD_ITEM,
          encodedPayload: newKey,
        },
      ],
    };

    const encodedPayload = u8aToHex(this.blockchainService.createItemizedSignaturePayloadV2Type(payload).toU8a());
    return {
      payload,
      encodedPayload,
    };
  }

  async getAddIcsPublicKeyAgreementPayload(
    msaId: string,
    newKeyHex: HexString,
  ): Promise<AddNewPublicKeyAgreementPayloadRequest> {
    const isMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (!isMsaId) {
      throw new NotFoundException(`MSA ID ${msaId} not found`);
    }
    const expiration = await this.getExpiration();
    const schemaId = await this.blockchainService.getLatestSchemaIdForIntent(this.icsKeyIntentId);

    const newKeyU8a = hexToU8a(newKeyHex);
    const itemizedStorage = await this.blockchainService.getItemizedStorage(msaId, this.icsKeyIntentId);

    const icsSerializedKeyForStorage = icsSdk.serializePublicKey(newKeyU8a);
    const encodedSerializedKey: HexString = u8aToHex(icsSerializedKeyForStorage);

    const foundKey = itemizedStorage.items.toArray().find((i) => i.payload.length > 0
      && u8aToHex(i.payload).toLowerCase() === encodedSerializedKey.toLowerCase()
    )

    if (foundKey) {
      throw new ConflictException('Requested key already exists!');
    }
    const payload: ItemizedSignaturePayloadDto = {
      expiration, schemaId, targetHash: itemizedStorage.content_hash.toNumber(),
      actions: [{ type: ItemActionType.ADD_ITEM, encodedPayload: encodedSerializedKey }]
    }

    const encodedPayload = u8aToHex(this.blockchainService.createItemizedSignaturePayloadV2Type(payload).toU8a());
    return {
      payload,
      encodedPayload,
    };
  }

  private async getExpiration(): Promise<number> {
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestBlockNumber();
    // standard expiration in SIWF is 10 minutes
    return lastFinalizedBlockNumber + 600 / BlockchainConstants.SECONDS_PER_BLOCK;
  }

  verifyAddKeySignatures(request: KeysRequestDto): boolean {
    const msaOwnerVerification = this.verifyOneAddKeySignature(
      request.msaOwnerAddress,
      request.msaOwnerSignature,
      request.payload,
    );
    const keyOwnerVerification = this.verifyOneAddKeySignature(
      request.payload.newPublicKey,
      request.newKeyOwnerSignature,
      request.payload,
    );
    return msaOwnerVerification.isValid && keyOwnerVerification.isValid;
  }

  verifyOneAddKeySignature(
    signer: string,
    signature: HexString,
    payload: KeysRequestPayloadDto,
  ): SignatureVerificationResult {
    const keyType = getKeypairTypeFromRequestAddress(signer);
    if (keyType === 'sr25519') {
      const encodedPayload = u8aToHex(
        u8aWrapBytes(this.blockchainService.createAddPublicKeyToMsaPayload(payload).toU8a()),
      );
      return verifySignature(encodedPayload, signature, signer);
    }
    const ethereumPayload = createEthereumAddKeyData(
      payload.msaId,
      payload.newPublicKey as HexString,
      payload.expiration,
    );
    // Note VERIFY WANTS THE ETHEREUM ADDRESS, not the public key.
    const isWrapped = false;
    const isValid = verifyEthereumSignature(
      signer as HexString,
      signature,
      ethereumPayload,
      this.blockchainService.chainType,
    );
    return { isValid, isWrapped };
  }

  verifyPublicKeyAgreementSignature(request: AddNewPublicKeyAgreementRequestDto): boolean {
    const keyType = getKeypairTypeFromRequestAddress(request.accountId);
    if (keyType === 'sr25519') {
      const encodedPayload = u8aToHex(
        u8aWrapBytes(this.blockchainService.createItemizedSignaturePayloadV2Type(request.payload).toU8a()),
      );
      return verifySignature(encodedPayload, request.proof, request.accountId).isValid;
    }
    // create a payload that Ethereum verify can use
    const actions: ItemizedAction[] = request.payload.actions.map((action: ItemActionDto) => {
      if (action.type === ItemActionType.ADD_ITEM) {
        return createItemizedAddAction(action.encodedPayload as HexString);
      }
      return createItemizedDeleteAction(action.index);
    });
    const ethereumPayload = createItemizedSignaturePayloadV2(
      request.payload.schemaId,
      request.payload.targetHash,
      request.payload.expiration,
      actions,
    );
    return verifyEthereumSignature(
      request.accountId as HexString,
      request.proof,
      ethereumPayload,
      this.blockchainService.chainType,
    );
  }
}
