import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { KeysResponse } from '#types/dtos/account/keys.response.dto';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EnvironmentInterface, EnvironmentType, Graph } from '@dsnp/graph-sdk';
import { HexString } from '@polkadot/util/types';
import {
  AddNewPublicKeyAgreementPayloadRequest,
  AddNewPublicKeyAgreementRequestDto,
  ItemActionType,
  ItemizedSignaturePayloadDto,
} from '#types/dtos/account/graphs.request.dto';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { BlockchainConstants } from '#account-lib/blockchain/blockchain-constants';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { KeysRequestDto } from '#types/dtos/account';
import { verifySignature } from '#utils/common/signature.util';

@Injectable()
export class KeysService {
  private readonly logger: Logger;

  private readonly graphKeySchemaId: number;

  constructor(
    @Inject(apiConfig.KEY) private readonly apiConf: IAccountApiConfig,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
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
    const lastFinalizedBlockNumber = await this.blockchainService.getLatestFinalizedBlockNumber();
    // standard expiration in SIWF is 10 minutes
    return lastFinalizedBlockNumber + 600 / BlockchainConstants.SECONDS_PER_BLOCK;
  }

  verifyAddKeySignature(request: KeysRequestDto): boolean {
    const encodedPayload = u8aToHex(
      u8aWrapBytes(this.blockchainService.createAddPublicKeyToMsaPayload(request.payload).toU8a()),
    );
    const msaOwnerVerification = verifySignature(encodedPayload, request.msaOwnerSignature, request.msaOwnerAddress);
    const keyOwnerVerification = verifySignature(
      encodedPayload,
      request.newKeyOwnerSignature,
      request.payload.newPublicKey,
    );
    return msaOwnerVerification.isValid && keyOwnerVerification.isValid;
  }

  verifyPublicKeyAgreementSignature(request: AddNewPublicKeyAgreementRequestDto): boolean {
    const encodedPayload = u8aToHex(
      u8aWrapBytes(this.blockchainService.createItemizedSignaturePayloadV2Type(request.payload).toU8a()),
    );
    return verifySignature(encodedPayload, request.proof, request.accountId).isValid;
  }
}
