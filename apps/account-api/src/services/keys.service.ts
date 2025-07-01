import { KeysResponse } from '#types/dtos/account/keys.response.dto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentInterface, EnvironmentType, Graph } from '@projectlibertylabs/graph-sdk';
import { HexString } from '@polkadot/util/types';
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
  getKeyPairTypeForKeyUriOrPrivateKey,
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
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

@Injectable()
export class KeysService {
  private readonly logger: Logger;

  private readonly graphKeySchemaId: number;

  constructor(
    @Inject(apiConfig.KEY) private readonly apiConf: IAccountApiConfig,
    private blockchainService: BlockchainRpcQueryService,
  ) {
    this.logger = pino(getBasicPinoOptions(KeysService.name));
    const { graphEnvironmentType } = this.apiConf;
    const environment: EnvironmentInterface = { environmentType: EnvironmentType[graphEnvironmentType] };
    const graphState = new Graph(environment);
    // there might be a better way to get this schema id but for now we are stuck to get it from graph-sdk
    this.graphKeySchemaId = graphState.getGraphConfig(environment).graphPublicKeySchemaId;
    graphState.freeGraphState();
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

  async getAddPublicKeyAgreementPayload(
    msaId: string,
    newKey: HexString,
  ): Promise<AddNewPublicKeyAgreementPayloadRequest> {
    const expiration = await this.getExpiration();
    const schemaId = this.graphKeySchemaId;
    const itemizedStorage = await this.blockchainService.getItemizedStorage(msaId, schemaId);
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
    const keyType = getKeyPairTypeForKeyUriOrPrivateKey(signer);
    if (keyType !== 'sr25519' && keyType !== 'ethereum') {
      this.logger.error(`Unsupported key type: ${keyType}`);
      return { isValid: false, isWrapped: false };
    }
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
    const keyType = getKeyPairTypeForKeyUriOrPrivateKey(request.accountId);
    if (keyType !== 'sr25519' && keyType !== 'ethereum') {
      this.logger.error(`Unsupported key type: ${keyType}`);
      return false;
    }
    if (keyType === 'sr25519') {
      const encodedPayload = u8aToHex(
        u8aWrapBytes(this.blockchainService.createItemizedSignaturePayloadV2Type(request.payload).toU8a()),
      );
      return verifySignature(encodedPayload, request.proof, request.accountId).isValid;
    }

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
