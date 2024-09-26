/* eslint-disable no-underscore-dangle */
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { options } from '@frequency-chain/api-augment';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { BlockHash, BlockNumber, Event, SignedBlock } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { AnyNumber, ISubmittableResult, SignerPayloadRaw } from '@polkadot/types/types';
import { Bytes, Option, u32 } from '@polkadot/types';
import {
  CommonPrimitivesMsaDelegation,
  CommonPrimitivesMsaProviderRegistryEntry,
  FrameSystemEventRecord,
  PalletCapacityCapacityDetails,
  PalletCapacityEpochInfo,
  PalletSchemasSchemaInfo,
} from '@polkadot/types/lookup';
import { HandleResponse, ItemizedStoragePageResponse, KeyInfoResponse } from '@frequency-chain/api-augment/interfaces';
import { HexString } from '@polkadot/util/types';
import {
  Delegation,
  HandleResponseDto,
  ItemActionType,
  ItemizedSignaturePayloadDto,
  KeysRequestDto,
  PublicKeyAgreementRequestDto,
  PublishHandleRequestDto,
  RetireMsaPayloadResponseDto,
  RevokeDelegationPayloadResponseDto,
  TransactionData,
} from '#types/dtos/account';
import { hexToU8a } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { Extrinsic } from './extrinsic';
import { chainDelegationToNative } from '#types/interfaces/account/delegations.interface';
import { TransactionType } from '#types/account-webhook';
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from './blockchain.config';

export type Sr25519Signature = { Sr25519: HexString };
interface SIWFTxnValues {
  msaId: string;
  address: string;
  handle: string;
  newProvider: string;
}

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

export interface ICapacityInfo {
  providerId: string;
  currentBlockNumber: number;
  nextEpochStart: number;
  remainingCapacity: bigint;
  totalCapacityIssued: bigint;
  currentEpoch: number;
}

@Injectable()
export class BlockchainService implements OnApplicationBootstrap, OnApplicationShutdown {
  public api: ApiPromise;

  private logger: Logger;

  private readyResolve: (boolean) => void;

  private readyReject: (reason: any) => void;

  private isReadyPromise = new Promise<boolean>((resolve, reject) => {
    this.readyResolve = resolve;
    this.readyReject = reject;
  });

  public async onApplicationBootstrap() {
    const providerUrl = this.config.frequencyUrl.toString();
    let provider: WsProvider | HttpProvider;
    try {
      if (/^ws/.test(providerUrl)) {
        provider = new WsProvider(providerUrl);
      } else if (/^http/.test(providerUrl)) {
        provider = new HttpProvider(providerUrl);
      } else {
        this.logger.error(`Unrecognized chain URL type: ${providerUrl}`);
        throw new Error('Unrecognized chain URL type');
      }
      this.api = await ApiPromise.create({ provider, ...options }).then((api) => api.isReady);
      this.readyResolve(await this.api.isReady);
      await this.validateProviderSeedPhrase();
      this.logger.log('Blockchain API ready.');
    } catch (err) {
      this.readyReject(err);
      throw err;
    }
  }

  public async isReady(): Promise<boolean> {
    return (await this.isReadyPromise) && !!(await this.api.isReady);
  }

  public async getApi(): Promise<ApiPromise> {
    await this.api.isReady;
    return this.api;
  }

  public async onApplicationShutdown(_signal?: string | undefined) {
    const promises: Promise<any>[] = [];
    if (this.api) {
      promises.push(this.api.disconnect());
    }
    await Promise.all(promises);
  }

  constructor(@Inject(blockchainConfig.KEY) private readonly config: IBlockchainConfig) {
    this.logger = new Logger(this.constructor.name);
  }

  public getBlockHash(block: BlockNumber | AnyNumber): Promise<BlockHash> {
    return this.api.rpc.chain.getBlockHash(block);
  }

  public getBlock(block?: BlockHash): Promise<SignedBlock> {
    return this.api.rpc.chain.getBlock(block);
  }

  public async getBlockByNumber(blockNumber: number): Promise<SignedBlock> {
    const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
    return this.api.rpc.chain.getBlock(blockHash);
  }

  public async getItemizedStorage(msaId: string, schemaId: number): Promise<ItemizedStoragePageResponse> {
    const msa = BigInt(msaId);
    return this.api.rpc.statefulStorage.getItemizedStorage(msa, schemaId);
  }

  public getLatestFinalizedBlockHash(): Promise<BlockHash> {
    return this.api.rpc.chain.getFinalizedHead();
  }

  public async getLatestFinalizedBlockNumber(): Promise<number> {
    const blockHash = await this.getLatestFinalizedBlockHash();
    return (await this.api.rpc.chain.getBlock(blockHash)).block.header.number.toNumber();
  }

  public async getBlockNumberForHash(hash: string): Promise<number | undefined> {
    const block = await this.api.rpc.chain.getBlock(hash);
    if (block) {
      return block.block.header.number.toNumber();
    }

    this.logger.error(`No block found corresponding to hash ${hash}`);
    return undefined;
  }

  public createType(type: string, ...args: (any | undefined)[]) {
    return this.api.registry.createType(type, ...args);
  }

  public createExtrinsicCall(
    { pallet, extrinsic }: { pallet: string; extrinsic: string },
    ...args: (any | undefined)[]
  ): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return this.api.tx[pallet][extrinsic](...args);
  }

  public createExtrinsic(
    { pallet, extrinsic }: { pallet: string; extrinsic: string },
    keys: KeyringPair,
    ...args: (any | undefined)[]
  ): Extrinsic {
    return new Extrinsic(this.api, this.api.tx[pallet][extrinsic](...args), keys);
  }

  public rpc(pallet: string, rpc: string, ...args: (any | undefined)[]): Promise<any> {
    return this.api.rpc[pallet][rpc](...args);
  }

  public query(pallet: string, extrinsic: string, ...args: (any | undefined)[]): Promise<any> {
    return args ? this.api.query[pallet][extrinsic](...args) : this.api.query[pallet][extrinsic]();
  }

  public async queryAt(
    blockHash: BlockHash,
    pallet: string,
    extrinsic: string,
    ...args: (any | undefined)[]
  ): Promise<any> {
    const newApi = await this.api.at(blockHash);
    return newApi.query[pallet][extrinsic](...args);
  }

  public async getNonce(account: string | Uint8Array): Promise<number> {
    return (await this.api.rpc.system.accountNextIndex(account)).toNumber();
  }

  public async getSchema(schemaId: number): Promise<PalletSchemasSchemaInfo> {
    const schema: PalletSchemasSchemaInfo = await this.query('schemas', 'schemas', schemaId);
    return schema;
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
  public async getMsaIdMax(): Promise<bigint> {
    const count = await this.query('msa', 'currentMsaIdentifierMaximum');
    // eslint-disable-next-line radix
    return BigInt(count);
  }

  public async isValidMsaId(msaId: string): Promise<boolean> {
    const msaIdMax = await this.getMsaIdMax();
    return BigInt(msaId) > 0n && BigInt(msaId) <= msaIdMax;
  }

  public async getKeysByMsa(msaId: string): Promise<KeyInfoResponse | null> {
    const keyInfoResponse = await this.api.rpc.msa.getKeysByMsaId(msaId);
    if (keyInfoResponse.isSome) {
      return keyInfoResponse.unwrap();
    }
    this.logger.error(`No keys found for msaId: ${msaId}`);
    return null;
  }

  public async addPublicKeyToMsa(keysRequest: KeysRequestDto): Promise<SubmittableExtrinsic<any>> {
    const { msaOwnerAddress, msaOwnerSignature, newKeyOwnerSignature, payload } = keysRequest;
    const msaIdU64 = this.api.createType('u64', payload.msaId);

    const txPayload = {
      ...payload,
      newPublicKey: decodeAddress(payload.newPublicKey),
      msaId: msaIdU64,
    };

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
    const txPayload = this.createItemizedSignaturePayloadV2Type(payload);

    return this.api.tx.statefulStorage.applyItemActionsWithSignatureV2(
      hexToU8a(accountId),
      { Sr25519: proof },
      txPayload,
    );
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

    return this.api.registry.createType('PalletStatefulStorageItemizedSignaturePayloadV2', {
      schemaId: payload.schemaId,
      targetHash: payload.targetHash,
      expiration: payload.expiration,
      actions,
    });
  }

  public async publishHandle(jobData: TransactionData<PublishHandleRequestDto>) {
    this.logger.debug(`claimHandlePayload: ${jobData.payload}`);
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

  public async getHandleForMsa(msaId: AnyNumber): Promise<HandleResponseDto | null> {
    const handleResponse: Option<HandleResponse> = await this.rpc('handles', 'getHandleForMsa', msaId.toString());
    if (handleResponse.isSome) {
      const handle = handleResponse.unwrap();
      return {
        base_handle: handle.base_handle.toString(),
        canonical_base: handle.canonical_base.toString(),
        suffix: handle.suffix.toNumber(),
      };
    }

    this.logger.error(`getHandleForMsa: No handle found for msaId: ${msaId}`);
    return null;
  }

  public async getCommonPrimitivesMsaDelegation(
    msaId: AnyNumber,
    providerId: AnyNumber,
  ): Promise<CommonPrimitivesMsaDelegation | null> {
    const delegationResponse = await this.api.query.msa.delegatorAndProviderToDelegation(msaId, providerId);
    return delegationResponse.unwrapOr(null);
  }

  public async getProviderDelegationForMsa(msaId: AnyNumber, providerId: AnyNumber): Promise<Delegation | null> {
    const response = await this.api.query.msa.delegatorAndProviderToDelegation(msaId, providerId);
    return response.isEmpty ? null : chainDelegationToNative(providerId, response.unwrap());
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

  public async publicKeyToMsaId(publicKey: string): Promise<string | null> {
    const handleResponse = await this.query('msa', 'publicKeyToMsaId', publicKey);
    if (handleResponse.isSome) return handleResponse.unwrap().toString();
    return null;
  }

  public async capacityInfo(providerId: AnyNumber): Promise<ICapacityInfo> {
    await this.isReady();
    const { epochStart }: PalletCapacityEpochInfo = await this.query('capacity', 'currentEpochInfo');
    const epochBlockLength: u32 = await this.query('capacity', 'epochLength');
    const capacityDetailsOption: Option<PalletCapacityCapacityDetails> = await this.query(
      'capacity',
      'capacityLedger',
      providerId,
    );
    const { remainingCapacity, totalCapacityIssued } = capacityDetailsOption.unwrapOr({
      remainingCapacity: 0,
      totalCapacityIssued: 0,
    });
    const currentBlock: u32 = await this.query('system', 'number');
    const currentEpoch = await this.getCurrentCapacityEpoch();
    return {
      currentEpoch,
      providerId: providerId.toString(),
      currentBlockNumber: currentBlock.toNumber(),
      nextEpochStart: epochStart.add(epochBlockLength).toNumber(),
      remainingCapacity:
        typeof remainingCapacity === 'number' ? BigInt(remainingCapacity) : remainingCapacity.toBigInt(),
      totalCapacityIssued:
        typeof totalCapacityIssued === 'number' ? BigInt(totalCapacityIssued) : totalCapacityIssued.toBigInt(),
    };
  }

  public async getCurrentCapacityEpoch(): Promise<number> {
    const currentEpoch = await this.api.query.capacity.currentEpoch();
    return currentEpoch.toNumber();
  }

  public async getCurrentCapacityEpochStart(): Promise<number> {
    const currentEpochInfo: PalletCapacityEpochInfo = await this.api.query.capacity.currentEpochInfo();
    return currentEpochInfo.epochStart.toNumber();
  }

  public async getCurrentEpochLength(): Promise<number> {
    const epochLength: u32 = await this.api.query.capacity.epochLength();
    return epochLength.toNumber();
  }

  /**
   * Handles the result of a SIWF transaction by extracting relevant values from the transaction events.
   * @param txResultEvents - The transaction result events to process.
   * @returns An object containing the extracted SIWF transaction values.
   */
  public async handleSIWFTxnResult(txResultEvents: FrameSystemEventRecord[]): Promise<SIWFTxnValues> {
    const siwfTxnValues: SIWFTxnValues = { msaId: '', handle: '', address: '', newProvider: '' };

    txResultEvents.forEach((record) => {
      // In the sign up flow, but when msa is already created, we do not have an MsaCreated event
      // We only have the DelegationGranted event, therefore check for events individually.
      if (record.event && this.api.events.msa.MsaCreated.is(record.event)) {
        siwfTxnValues.msaId = record.event.data.msaId.toString();
        siwfTxnValues.address = record.event.data.key.toString();
      }
      if (record.event && this.api.events.handles.HandleClaimed.is(record.event)) {
        const handleHex = record.event.data.handle.toString();
        // Remove the 0x prefix from the handle and convert the hex handle to a utf-8 string
        const handleData = handleHex.slice(2);
        siwfTxnValues.handle = Buffer.from(handleData.toString(), 'hex').toString('utf-8');
        if (!siwfTxnValues.msaId) siwfTxnValues.msaId = record.event.data.msaId.toString();
      }
      if (record.event && this.api.events.msa.DelegationGranted.is(record.event)) {
        siwfTxnValues.newProvider = record.event.data.providerId.toString();
        if (!siwfTxnValues.msaId) siwfTxnValues.msaId = record.event.data.delegatorId.toString();
      }
    });

    // If one of the above events has previously occurred, we still need to set those values.
    if (siwfTxnValues.handle === '') {
      const handle = await this.getHandleForMsa(siwfTxnValues.msaId);
      siwfTxnValues.handle = `${handle?.base_handle}.${handle?.suffix}`;
    }
    if (siwfTxnValues.address === '') {
      const keyInfo = await this.getKeysByMsa(siwfTxnValues.msaId);
      siwfTxnValues.address = keyInfo?.msa_keys[0].toString();
    }
    if (siwfTxnValues.newProvider === '') {
      siwfTxnValues.newProvider = this.config.providerId.toString();
    }

    return siwfTxnValues;
  }

  /**
   * Handles the publish handle transaction result events and extracts the handle and msaId from the event data.
   * @param event - The HandleClaimed event
   * @returns An object containing the extracted handle, msaId, and debug message.
   */
  public handlePublishHandleTxResult(event: Event): HandleTxnValues {
    const handleTxnValues: Partial<HandleTxnValues> = {};

    if (this.api.events.handles.HandleClaimed.is(event)) {
      const handleHex = event.data.handle.toString();
      // Remove the 0x prefix from the handle and convert the hex handle to a utf-8 string
      const handleData = handleHex.slice(2);
      handleTxnValues.handle = Buffer.from(handleData.toString(), 'hex').toString('utf-8');
      handleTxnValues.msaId = event.data.msaId.toString();
      handleTxnValues.debugMsg = `Handle created: ${handleTxnValues.handle} for msaId: ${handleTxnValues.msaId}`;
    }

    return handleTxnValues as HandleTxnValues;
  }

  /**
   * Handles the PublicKeyAdded transaction result events and extracts the public key from the event data.
   * @param {Event} event - The PublicKeyAdded event
   * @returns {PublicKeyValues} An object containing the MSA Id & new public key
   */
  public handlePublishKeyTxResult(event: Event): PublicKeyValues {
    const publicKeyValues: Partial<PublicKeyValues> = {};

    // Grab the event data
    if (event && this.api.events.msa.PublicKeyAdded.is(event)) {
      publicKeyValues.msaId = event.data.msaId.toString();
      publicKeyValues.newPublicKey = event.data.key.toString();
      publicKeyValues.debugMsg = `Public Key: ${publicKeyValues.newPublicKey} Added for msaId: ${publicKeyValues.msaId}`;
    }

    return publicKeyValues as PublicKeyValues;
  }

  /**
   * Handles the ItemizedPageUpdated transaction result events and extracts the public key from the event data.
   * @param {Event} event - The ItemizedPageUpdated event
   * @returns {ItemizedPageUpdated} An object containing the MSA Id & new public key
   */
  public handlePublishPublicKeyAgreementTxResult(event: Event): ItemizedPageUpdated {
    const itemizedKeyValues: Partial<ItemizedPageUpdated> = {};

    // Grab the event data
    if (event && this.api.events.statefulStorage.ItemizedPageUpdated.is(event)) {
      itemizedKeyValues.msaId = event.data.msaId.toString();
      itemizedKeyValues.schemaId = event.data.schemaId.toString();
      itemizedKeyValues.prevContentHash = event.data.prevContentHash.toString();
      itemizedKeyValues.currContentHash = event.data.currContentHash.toString();
      itemizedKeyValues.debugMsg = `Itemized Page updated for msaId: ${itemizedKeyValues.msaId} and schemaId: ${itemizedKeyValues.schemaId}`;
    }

    return itemizedKeyValues as ItemizedPageUpdated;
  }

  public async validateProviderSeedPhrase() {
    const { providerSeedPhrase, providerId } = this.config;
    if (providerSeedPhrase) {
      const address = await addressFromSeedPhrase(providerSeedPhrase);
      const resolvedProviderId = await this.publicKeyToMsaId(address);

      if (resolvedProviderId !== providerId.toString()) {
        throw new Error('Provided account secret does not match configured Provider ID');
      }

      const providerInfo = await this.getProviderToRegistryEntry(providerId);
      if (!providerInfo) {
        throw new Error(`MSA ID ${providerId.toString()} is not a registered provider`);
      }
    }
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
    const signerPayload = await BlockchainService.getRawPayloadForSigning(tx, accountId);
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

  public decodeTransaction(encodedExtrinsic: string) {
    return this.api.tx(encodedExtrinsic);
  }
}
