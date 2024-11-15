/* eslint-disable new-cap */
/* eslint-disable no-underscore-dangle */
import { Inject, Injectable } from '@nestjs/common';
import {
  AccountId,
  AccountId32,
  BlockHash,
  BlockNumber,
  Event,
  FeeDetails,
  SignedBlock,
} from '@polkadot/types/interfaces';
import { ApiDecoration, SubmittableExtrinsic } from '@polkadot/api/types';
import { AnyNumber, Codec, DetectCodec, ISubmittableResult, SignerPayloadRaw } from '@polkadot/types/types';
import { bool, Bytes, Option, u128, u16, Vec } from '@polkadot/types';
import {
  CommonPrimitivesMsaDelegation,
  CommonPrimitivesMsaProviderRegistryEntry,
  FrameSystemEventRecord,
  PalletCapacityCapacityDetails,
  PalletSchemasSchemaInfo,
  PalletSchemasSchemaVersionId,
} from '@polkadot/types/lookup';
import {
  ItemizedStoragePageResponse,
  KeyInfoResponse,
  PaginatedStorageResponse,
} from '@frequency-chain/api-augment/interfaces';
import { HexString } from '@polkadot/util/types';
import {
  Delegation,
  HandleResponseDto,
  ItemActionType,
  ItemizedSignaturePayloadDto,
  KeysRequestDto,
  KeysRequestPayloadDto,
  PublicKeyAgreementRequestDto,
  PublishHandleRequestDto,
  RetireMsaPayloadResponseDto,
  RevokeDelegationPayloadResponseDto,
  TransactionData,
} from '#types/dtos/account';
import { hexToU8a } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { chainDelegationToNative } from '#types/interfaces/account/delegations.interface';
import { TransactionType } from '#types/account-webhook';
import { IBlockchainNonProviderConfig, noProviderBlockchainConfig } from './blockchain.config';
import { PolkadotApiService } from './polkadot-api.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise } from '@polkadot/api';

export type Sr25519Signature = { Sr25519: HexString };
export type NetworkType = 'mainnet' | 'testnet-paseo' | 'unknown';
interface HandleTxnValues {
  msaId: string;
  handle: string;
  debugMsg: string;
}

interface PublicKeyValues {
  msaId: string;
  newPublicKey: string;
  debugMsg: string;
}

interface ItemizedPageUpdated {
  msaId: string;
  schemaId: string;
  prevContentHash: string;
  currContentHash: string;
  debugMsg: string;
}

interface MsaRetired {
  msaId: string;
  debugMsg: string;
}

interface DelegationRevoked {
  msaId: string;
  providerId: string;
  debugMsg: string;
}

export interface ICapacityInfo {
  providerId: string;
  currentBlockNumber: number;
  nextEpochStart: number;
  remainingCapacity: bigint;
  totalCapacityIssued: bigint;
  currentEpoch: number;
}

export interface IBlockPaginationRequest {
  readonly from_block: number;
  readonly from_index: number;
  readonly to_block: number;
  readonly page_size: number;
}

@Injectable()
export class BlockchainRpcQueryService extends PolkadotApiService {
  constructor(
    @Inject(noProviderBlockchainConfig.KEY) baseConfig: IBlockchainNonProviderConfig,
    eventEmitter: EventEmitter2,
  ) {
    super(baseConfig, eventEmitter);
  }

  // ******************************** RPC methods ********************************

  public getBlockHash(block: BlockNumber | AnyNumber): Promise<BlockHash> {
    return this.api.rpc.chain.getBlockHash(block);
  }

  public getBlock(block?: BlockHash): Promise<SignedBlock> {
    return this.api.rpc.chain.getBlock(block);
  }

  public async getBlockByNumber(blockNumber: AnyNumber | BlockNumber): Promise<SignedBlock> {
    const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
    return this.api.rpc.chain.getBlock(blockHash);
  }

  public async getItemizedStorage(msaId: AnyNumber, schemaId: AnyNumber): Promise<ItemizedStoragePageResponse> {
    return this.api.rpc.statefulStorage.getItemizedStorage(msaId, schemaId);
  }

  public async getPaginatedStorage(msaId: AnyNumber, schemaId: AnyNumber): Promise<PaginatedStorageResponse[]> {
    const response: Vec<PaginatedStorageResponse> = await this.api.rpc.statefulStorage.getPaginatedStorage(
      msaId,
      schemaId,
    );

    return response.toArray();
  }

  public getLatestFinalizedBlockHash(): Promise<BlockHash> {
    return this.api.rpc.chain.getFinalizedHead();
  }

  public async getLatestFinalizedBlockNumber(): Promise<number> {
    const blockHash = await this.getLatestFinalizedBlockHash();
    return (await this.api.rpc.chain.getHeader(blockHash)).number.toNumber();
  }

  public async getBlockNumberForHash(hash: string | Uint8Array | BlockHash): Promise<number | undefined> {
    const header = await this.api.rpc.chain.getHeader(hash);
    if (header) {
      return header.number.toNumber();
    }

    this.logger.error(`No block found corresponding to hash ${hash}`);
    return undefined;
  }

  /**
   * Validates a given handle by querying the blockchain.
   *
   * @param {string} baseHandle - The base handle to be validated.
   * @returns {Promise<bool>} - A promise that resolves to a bool indicating whether the handle is valid.
   */
  public async isValidHandle(baseHandle: string): Promise<bool> {
    return this.api.rpc.handles.validateHandle(baseHandle);
  }

  public async getNonce(account: string | Uint8Array | AccountId): Promise<number> {
    return (await this.api.rpc.system.accountNextIndex(account)).toNumber();
  }

  public async getKeysByMsa(msaId: string): Promise<KeyInfoResponse | null> {
    return this.handleOptionResult(this.api.rpc.msa.getKeysByMsaId(msaId), `No keys found for msaId: ${msaId}`);
  }

  public async getHandleForMsa(msaId: AnyNumber): Promise<HandleResponseDto | null> {
    const handleResponse = await this.handleOptionResult(
      this.api.rpc.handles.getHandleForMsa(msaId),
      `getHandleForMsa: No handle found for msaId: ${msaId}`,
    );

    return handleResponse
      ? {
          base_handle: handleResponse.base_handle.toString(),
          canonical_base: handleResponse.canonical_base.toString(),
          suffix: handleResponse.suffix.toNumber(),
        }
      : null;
  }

  public async getCommonPrimitivesMsaDelegation(
    msaId: AnyNumber,
    providerId: AnyNumber,
  ): Promise<CommonPrimitivesMsaDelegation | null> {
    return this.handleOptionResult(this.api.query.msa.delegatorAndProviderToDelegation(msaId, providerId));
  }

  public async getProviderDelegationForMsa(msaId: AnyNumber, providerId: AnyNumber): Promise<Delegation | null> {
    const response = await this.handleOptionResult(
      this.api.query.msa.delegatorAndProviderToDelegation(msaId, providerId),
    );
    return response ? chainDelegationToNative(providerId, response) : null;
  }

  public async getDelegationsForMsa(msaId: AnyNumber): Promise<Delegation[]> {
    const response = (await this.api.query.msa.delegatorAndProviderToDelegation.entries(msaId))
      .filter(([_, entry]) => entry.isSome)
      .map(([key, value]) => chainDelegationToNative(key.args[1], value.unwrap()));

    return response;
  }

  public async getProviderToRegistryEntry(
    providerId: AnyNumber,
  ): Promise<CommonPrimitivesMsaProviderRegistryEntry | null> {
    const providerRegistry = await this.api.query.msa.providerToRegistryEntry(providerId);
    if (providerRegistry.isSome) return providerRegistry.unwrap();
    return null;
  }

  public async publicKeyToMsaId(publicKey: string | Uint8Array | AccountId32): Promise<string | null> {
    const response = await this.handleOptionResult(this.api.query.msa.publicKeyToMsaId(publicKey));
    return response ? response.toString() : null;
  }

  public async capacityInfo(providerId: AnyNumber, blockHash?: Uint8Array | string): Promise<ICapacityInfo> {
    await this.isReady();
    const api = await this.getApi(blockHash);
    const epochStart = await this.getCurrentCapacityEpochStart(blockHash);
    const epochBlockLength = await this.getCurrentEpochLength(blockHash);
    const capacityDetailsOption: Option<PalletCapacityCapacityDetails> =
      await api.query.capacity.capacityLedger(providerId);
    const { remainingCapacity, totalCapacityIssued } = capacityDetailsOption.unwrapOr({
      remainingCapacity: new u128(this.api.registry, 0),
      totalCapacityIssued: new u128(this.api.registry, 0),
    });
    const currentBlockNumber = (await api.query.system.number()).toNumber();
    const currentEpoch = await this.getCurrentCapacityEpoch();
    return {
      currentEpoch,
      providerId: providerId.toString(),
      currentBlockNumber,
      nextEpochStart: epochStart + epochBlockLength,
      remainingCapacity: remainingCapacity.toBigInt(),
      totalCapacityIssued: totalCapacityIssued.toBigInt(),
    };
  }

  public async checkTxCapacityLimit(providerId: AnyNumber, encodedExt: HexString): Promise<boolean> {
    try {
      const capacityInfo = await this.capacityInfo(providerId);
      const { remainingCapacity } = capacityInfo;

      // Calculate the total capacity cost for all encoded extensions
      let totalAdjustedWeightFee = BigInt(0);
      const capacityCost = await this.getCapacityCostForExt(encodedExt);
      if (capacityCost.inclusionFee.isSome) {
        const inclusionFee = capacityCost.inclusionFee.unwrap();
        totalAdjustedWeightFee += inclusionFee.adjustedWeightFee.toBigInt();
      }

      // Check if the total cost exceeds the remaining capacity
      const outOfCapacity = remainingCapacity < totalAdjustedWeightFee;
      return outOfCapacity;
    } catch (e) {
      this.logger.error(`Error checking capacity limit: ${e}`);
      return false;
    }
  }

  public async getCurrentCapacityEpoch(blockHash?: Uint8Array | string): Promise<number> {
    const api = await this.getApi(blockHash);
    return (await api.query.capacity.currentEpoch()).toNumber();
  }

  public async getCurrentCapacityEpochStart(blockHash?: Uint8Array | string): Promise<number> {
    const api = await this.getApi(blockHash);
    return (await api.query.capacity.currentEpochInfo()).epochStart.toNumber();
  }

  public async getCurrentEpochLength(blockHash?: Uint8Array | string): Promise<number> {
    const api = await this.getApi(blockHash);
    return (await api.query.capacity.epochLength()).toNumber();
  }

  public async getCapacityCostForExt(enocdedExt: HexString): Promise<FeeDetails> {
    return this.api.rpc.frequencyTxPayment.computeCapacityFeeDetails(enocdedExt, null);
  }

  public async getMessagesBySchemaId(schemaId: AnyNumber, pagination: IBlockPaginationRequest) {
    return this.api.rpc.messages.getBySchemaId(schemaId, pagination);
  }

  // ********************************* Query methods (accept optional block hash for "at" queries) *********************************

  public async getSchema(
    schemaId: AnyNumber,
    blockHash?: Uint8Array | string,
  ): Promise<PalletSchemasSchemaInfo | null> {
    const api = await this.getApi(blockHash);
    return this.handleOptionResult(api.query.schemas.schemaInfos(schemaId));
  }

  public async getSchemaIdByName(
    schemaNamespace: string,
    schemaDescriptor: string,
    blockHash?: Uint8Array | string,
  ): Promise<number> {
    const api = await this.getApi(blockHash);
    const { ids }: { ids: Vec<u16> } = await api.query.schemas.schemaNameToIds(schemaNamespace, schemaDescriptor);
    const schemaId = ids.toArray().pop()?.toNumber();
    if (!schemaId) {
      throw new Error(`Unable to determine schema ID for "${schemaNamespace}.${schemaDescriptor}"`);
    }

    return schemaId;
  }

  public async getSchemaPayload(schemaId: AnyNumber, blockHash?: Uint8Array | string): Promise<Bytes | null> {
    const api = await this.getApi(blockHash);
    return this.handleOptionResult(api.query.schemas.schemaPayloads(schemaId));
  }

  public async getSchemaNamesToIds(args: [namespace: string, name: string][]) {
    const versions = await this.api.query.schemas.schemaNameToIds.multi(args);
    return versions.map((schemaVersions: PalletSchemasSchemaVersionId, index) => ({
      name: args[index],
      ids: schemaVersions.ids.map((version) => version.toNumber()),
    }));
  }

  public async getMessageKeysInBlock(blockNumber: AnyNumber): Promise<[number, number][]> {
    return (await this.api.query.messages.messagesV2.keys(blockNumber)).map((key) => {
      const [_, schemaId, index] = key.args;
      return [schemaId.toNumber(), index.toNumber()];
    });
  }

  /**
   * Return the current maximum MSA Id.
   *
   * NOTE: in most other places we treat MSA Id as a string to eliminate
   * portability problems with `bigint`, but here we explicitly return it
   * as a `bigint` because the return value of this function is used almost
   * exclusively in the context of a mathematical comparison.
   *
   * @returns {bigint} The current maximum MSA Id from the chain
   */
  public async getMsaIdMax(blockHash?: Uint8Array | string): Promise<bigint> {
    const api = await this.getApi(blockHash);
    return (await api.query.msa.currentMsaIdentifierMaximum()).toBigInt();
  }

  public async isValidMsaId(msaId: string, blockHash?: Uint8Array | string): Promise<boolean> {
    const msaIdMax = await this.getMsaIdMax(blockHash);
    return BigInt(msaId) > 0n && BigInt(msaId) <= msaIdMax;
  }

  // ********************************* Transaction/Payload/Type methods *********************************

  public get events() {
    return this.api.events;
  }

  public async getEvents(blockHash?: Uint8Array | string): Promise<FrameSystemEventRecord[]> {
    // eslint-disable-next-line prefer-destructuring
    let api: ApiPromise | ApiDecoration<'promise'> = this.api;
    if (blockHash) {
      api = await this.api.at(blockHash);
    }

    return (await api.query.system.events()).toArray();
  }

  public async addPublicKeyToMsa(keysRequest: KeysRequestDto): Promise<SubmittableExtrinsic<any>> {
    const { msaOwnerAddress, msaOwnerSignature, newKeyOwnerSignature, payload } = keysRequest;
    const txPayload = this.createAddPublicKeyToMsaPayload(payload);

    const addKeyResponse = this.api.tx.msa.addPublicKeyToMsa(
      msaOwnerAddress,
      { Sr25519: msaOwnerSignature },
      { Sr25519: newKeyOwnerSignature },
      txPayload,
    );
    return addKeyResponse;
  }

  public async addPublicKeyAgreementToMsa(
    keysRequest: PublicKeyAgreementRequestDto,
  ): Promise<SubmittableExtrinsic<any>> {
    const { accountId, payload, proof } = keysRequest;
    const decodedAccount = decodeAddress(accountId);
    const txPayload = this.createItemizedSignaturePayloadV2Type(payload);

    return this.api.tx.statefulStorage.applyItemActionsWithSignatureV2(decodedAccount, { Sr25519: proof }, txPayload);
  }

  public createClaimHandPayloadType(baseHandle: string, expiration: number) {
    const handleVec = new Bytes(this.api.registry, baseHandle).toHex();
    return this.api.registry.createType('CommonPrimitivesHandlesClaimHandlePayload', {
      baseHandle: handleVec,
      expiration,
    });
  }

  // eslint-disable-next-line consistent-return, class-methods-use-this
  public async getRawPayloadForSigning(
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
    signerAddress: string,
    // eslint-disable-next-line consistent-return
  ): Promise<SignerPayloadRaw> {
    let signRaw;
    try {
      await tx.signAsync(signerAddress, {
        signer: {
          signRaw: (raw) => {
            this.logger.verbose('signRaw called with [raw]:', raw);
            signRaw = raw;
            // Interrupt the signing process to get the raw payload, as encoded by polkadot-js
            throw new Error('Stop here');
          },
        },
      });
    } catch (_e) {
      return signRaw;
    }
  }

  public async createRevokedDelegationPayload(
    accountId: string,
    providerId: string,
  ): Promise<RevokeDelegationPayloadResponseDto> {
    // Get the transaction for revokeDelegation, will be used to get the raw payload for signing
    const tx = this.api.tx.msa.revokeDelegationByDelegator(providerId);

    // payload contains the signer address, the encoded data/payload for revokeDelegationByDelegator,
    // and the type of the payload
    const signerPayload = await this.getRawPayloadForSigning(tx, accountId);

    // encoded payload
    const { data } = signerPayload;

    return {
      accountId,
      providerId,
      encodedExtrinsic: tx.toHex(),
      payloadToSign: data as HexString,
    };
  }

  public async revokeDelegationByDelegator(
    providerId: string,
  ): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> {
    return this.api.tx.msa.revokeDelegationByDelegator(providerId);
  }

  /**
   * Handles the DelegationRevoked transaction result events and extracts the MSA ID and Provider ID from the event data.
   * @param {Event} event - The DelegationRevoked event
   * @returns {DelegationRevoked} The revoked delegation information
   */
  public handleRevokeDelegationTxResult(event: Event): DelegationRevoked {
    // Grab the event data
    if (event && this.api.events.msa.DelegationRevoked.is(event)) {
      const providerId = event.data.providerId.toString();
      const msaId = event.data.delegatorId.toString();

      return {
        msaId,
        providerId,
        debugMsg: `Delegation revoked for msaId: ${msaId}, providerId: ${providerId}`,
      };
    }

    this.logger.error(`Expected DelegationRevoked event but found ${event}`);
    return {} as DelegationRevoked;
  }

  public createAddPublicKeyToMsaPayload(payload: KeysRequestPayloadDto): any {
    const msaIdU64 = this.api.createType('u64', payload.msaId);

    const txPayload = {
      expiration: payload.expiration,
      newPublicKey: decodeAddress(payload.newPublicKey),
      msaId: msaIdU64,
    };

    return this.api.createType('PalletMsaAddKeyData', txPayload);
  }

  public createItemizedSignaturePayloadV2Type(payload: ItemizedSignaturePayloadDto): any {
    const actions = payload.actions.map((a) => {
      switch (a.type) {
        case ItemActionType.ADD_ITEM:
          return this.api.registry.createType('PalletStatefulStorageItemAction', {
            Add: {
              data: Array.from(hexToU8a(a.encodedPayload)),
            },
          });
        case ItemActionType.DELETE_ITEM:
          return this.api.registry.createType('PalletStatefulStorageItemAction', {
            Delete: {
              index: a.index,
            },
          });
        default:
          throw new Error(`No action item type : ${a}`);
      }
    });

    return this.api.createType('PalletStatefulStorageItemizedSignaturePayloadV2', {
      schemaId: payload.schemaId,
      targetHash: payload.targetHash,
      expiration: payload.expiration,
      actions,
    });
  }

  public async publishHandle(jobData: TransactionData<PublishHandleRequestDto>) {
    this.logger.debug(`claimHandlePayload: ${JSON.stringify(jobData.payload)}`);
    this.logger.debug(`accountId: ${jobData.accountId}`);

    const claimHandleProof: Sr25519Signature = { Sr25519: jobData.proof };
    this.logger.debug(`claimHandleProof: ${JSON.stringify(claimHandleProof)}`);

    switch (jobData.type) {
      case TransactionType.CREATE_HANDLE:
        return this.api.tx.handles.claimHandle(jobData.accountId, claimHandleProof, jobData.payload);
      case TransactionType.CHANGE_HANDLE:
        return this.api.tx.handles.changeHandle(jobData.accountId, claimHandleProof, jobData.payload);
      default:
        throw new Error(`Unrecognized transaction type: ${(jobData as any).type}`);
    }
  }

  /**
   * Handles the publish handle transaction result events and extracts the handle and msaId from the event data.
   * @param event - The HandleClaimed event
   * @returns An object containing the extracted handle, msaId, and debug message.
   */
  public handlePublishHandleTxResult(event: Event): HandleTxnValues {
    if (this.api.events.handles.HandleClaimed.is(event)) {
      // Remove the 0x prefix from the handle and convert the hex handle to a utf-8 string
      const handle = Buffer.from(event.data.handle.toString().slice(2), 'hex').toString('utf-8');
      const msaId = event.data.msaId.toString();

      return {
        handle,
        msaId,
        debugMsg: `Handle created: ${handle} for msaId: ${msaId}`,
      };
    }

    this.logger.error(`Expected HandleClaimed event but found ${event}`);
    return {} as HandleTxnValues;
  }

  /**
   * Handles the PublicKeyAdded transaction result events and extracts the public key from the event data.
   * @param {Event} event - The PublicKeyAdded event
   * @returns {PublicKeyValues} An object containing the MSA Id & new public key
   */
  public handlePublishKeyTxResult(event: Event): PublicKeyValues {
    // Grab the event data
    if (event && this.api.events.msa.PublicKeyAdded.is(event)) {
      const msaId = event.data.msaId.toString();
      const newPublicKey = event.data.key.toString();

      return {
        msaId,
        newPublicKey,
        debugMsg: `Public Key: ${newPublicKey} Added for msaId: ${msaId}`,
      };
    }

    this.logger.error(`Expected PublicKeyAdded event but found ${event}`);
    return {} as PublicKeyValues;
  }

  /**
   * Handles the ItemizedPageUpdated transaction result events and extracts the public key from the event data.
   * @param {Event} event - The ItemizedPageUpdated event
   * @returns {ItemizedPageUpdated} An object containing the MSA Id & new public key
   */
  public handlePublishPublicKeyAgreementTxResult(event: Event): ItemizedPageUpdated {
    // Grab the event data
    if (event && this.api.events.statefulStorage.ItemizedPageUpdated.is(event)) {
      const msaId = event.data.msaId.toString();
      const schemaId = event.data.schemaId.toString();
      const prevContentHash = event.data.prevContentHash.toString();
      const currContentHash = event.data.currContentHash.toString();

      return {
        msaId,
        schemaId,
        prevContentHash,
        currContentHash,
        debugMsg: `Itemized Page updated for msaId: ${msaId} and schemaId: ${schemaId}`,
      };
    }

    this.logger.error(`Expected ItemizedPageUpdated event but found ${event}`);
    return {} as ItemizedPageUpdated;
  }

  public static async getRawPayloadForSigning(
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
    signerAddress: string,
  ): Promise<SignerPayloadRaw> {
    const dummyError = 'Stop here';

    let signRaw: SignerPayloadRaw;
    try {
      await tx.signAsync(signerAddress, {
        signer: {
          signRaw: (raw) => {
            signRaw = raw;
            // Interrupt the signing process to get the raw payload, as encoded by polkadot-js
            throw new Error(dummyError);
          },
        },
      });
    } catch (e: any) {
      if (e?.message !== dummyError) {
        throw e;
      }
    }

    return signRaw;
  }

  public async createRetireMsaPayload(accountId: string): Promise<RetireMsaPayloadResponseDto> {
    // Get the transaction for retireMsa, will be used to get the raw payload for signing
    const tx = this.api.tx.msa.retireMsa();

    // payload contains the signer address, the encoded data/payload for retireMsa, and the type of the payload
    const signerPayload = await BlockchainRpcQueryService.getRawPayloadForSigning(tx, accountId);
    this.logger.debug('payload: SignerPayloadRaw: ', signerPayload);
    // encoded payload
    const { data } = signerPayload;

    return {
      encodedExtrinsic: tx.toHex(),
      payloadToSign: data as HexString,
      accountId,
    };
  }

  public async retireMsa() {
    return this.api.tx.msa.retireMsa();
  }

  /**
   * Handles the MsaRetired transaction result events and extracts the retired MSA ID from the event data.
   * @param {Event} event - The MsaRetired event
   * @returns {MsaRetired} The MSA ID that was retired
   */
  public handleRetireMsaTxResult(event: Event): MsaRetired {
    // Grab the event data
    if (event && this.api.events.msa.MsaRetired.is(event)) {
      const msaId = event.data.msaId.toString();

      return {
        msaId,
        debugMsg: `MSA retired for msaId: ${msaId}`,
      };
    }

    this.logger.error(`Expected MsaRetired event but found ${event}`);
    return {} as MsaRetired;
  }

  public upsertPage(
    msaId: AnyNumber,
    schemaId: AnyNumber,
    pageId: AnyNumber,
    targetHash: AnyNumber,
    payload: number[],
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    // TODO: Investigate why 'payload' is passed as number[] instead of Uint8Array
    return this.api.tx.statefulStorage.upsertPage(msaId, schemaId, pageId, targetHash, payload as any);
  }

  public deletePage(
    msaId: AnyNumber,
    schemaId: AnyNumber,
    pageId: AnyNumber,
    targetHash: AnyNumber,
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return this.api.tx.statefulStorage.deletePage(msaId, schemaId, pageId, targetHash);
  }

  public addIpfsMessage(
    schemaId: AnyNumber,
    cid: string,
    payloadLength: number,
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return this.api.tx.messages.addIpfsMessage(schemaId, cid, payloadLength);
  }

  public decodeTransaction(encodedExtrinsic: string) {
    return this.api.tx(encodedExtrinsic);
  }

  public async handleOptionResult<T extends Codec>(rpc: Promise<Option<T>>, msg?: string): Promise<T | null> {
    const result: T | null = (await rpc).unwrapOr(null);
    if (!result && msg) {
      this.logger.error(msg);
    }

    return result;
  }

  public getNetworkType(): NetworkType {
    switch (this.api.genesisHash.toHex()) {
      case '0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1':
        return 'mainnet';
      case '0x203c6838fc78ea3660a2f298a58d859519c72a5efdc0f194abd6f0d5ce1838e0':
        return 'testnet-paseo';
      default:
        return 'unknown';
    }
  }

  public createType<T extends Codec = Codec, K extends string = string>(
    type: K,
    ...params: unknown[]
  ): DetectCodec<T, K> {
    return this.api.createType<T, K>(type, ...params);
  }
}
