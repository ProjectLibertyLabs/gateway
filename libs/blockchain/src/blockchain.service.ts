/* eslint-disable new-cap */
/* eslint-disable no-underscore-dangle */
import fs from 'fs';
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { options } from '@frequency-chain/api-augment';
import { ApiPromise, HttpProvider, Keyring, WsProvider } from '@polkadot/api';
import { AccountId, AccountId32, BlockHash, BlockNumber, Call, Event, SignedBlock } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { AnyNumber, Codec, DetectCodec, IMethod, ISubmittableResult, SignerPayloadRaw } from '@polkadot/types/types';
import { Bytes, Option, u128, Vec } from '@polkadot/types';
import {
  CommonPrimitivesMsaDelegation,
  CommonPrimitivesMsaProviderRegistryEntry,
  FrameSystemEventRecord,
  PalletCapacityCapacityDetails,
  PalletSchemasSchemaInfo,
} from '@polkadot/types/lookup';
import { ItemizedStoragePageResponse, KeyInfoResponse } from '@frequency-chain/api-augment/interfaces';
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
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from './blockchain.config';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { NONCE_SERVICE_REDIS_NAMESPACE } from '#types/constants';

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

/**
 * To be able to provide mostly unique nonces to submit transactions on chain we would need to check a number of
 * temporarily locked keys on redis side and get the first available one. This number defines the number of keys
 * we should look into before giving up
 */
const NUMBER_OF_NONCE_KEYS_TO_CHECK = 50;

/**
 * Nonce keys have to get expired shortly so that if any of nonce numbers get skipped we would still have a way to
 * submit them after expiration
 */
const NONCE_KEY_EXPIRE_SECONDS = 2;
const CHAIN_NONCE_KEY = 'chain:nonce';

function getNonceKey(suffix: string) {
  return `${CHAIN_NONCE_KEY}:${suffix}`;
}

function getNextPossibleNonceKeys(currentNonce: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < NUMBER_OF_NONCE_KEYS_TO_CHECK; i += 1) {
    const key = currentNonce + i;
    keys.push(getNonceKey(`${key}`));
  }
  return keys;
}
@Injectable()
export class BlockchainService implements OnApplicationBootstrap, OnApplicationShutdown {
  public api: ApiPromise;

  private logger: Logger;

  private accountId: string;

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
      this.accountId = await addressFromSeedPhrase(this.config.providerSeedPhrase);
      const nextNonce = await this.getNextNonce();
      this.logger.log(`nonce is set to ${nextNonce}`);
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

  constructor(
    @Inject(blockchainConfig.KEY) private readonly config: IBlockchainConfig,
    @InjectRedis(NONCE_SERVICE_REDIS_NAMESPACE) private nonceRedis: Redis,
  ) {
    this.logger = new Logger(this.constructor.name);
    nonceRedis.defineCommand('incrementNonce', {
      numberOfKeys: NUMBER_OF_NONCE_KEYS_TO_CHECK,
      lua: fs.readFileSync('lua/incrementNonce.lua', 'utf8'),
    });
  }

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

  public createType<T extends Codec = Codec, K extends string = string>(
    type: K,
    ...params: unknown[]
  ): DetectCodec<T, K> {
    return this.api.createType<T, K>(type, ...params);
  }

  public async getNonce(account: string | Uint8Array | AccountId): Promise<number> {
    return (await this.api.rpc.system.accountNextIndex(account)).toNumber();
  }

  public async getSchema(schemaId: AnyNumber): Promise<PalletSchemasSchemaInfo | null> {
    return this.handleOptionResult(this.api.query.schemas.schemaInfos(schemaId));
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
    return (await this.api.query.msa.currentMsaIdentifierMaximum()).toBigInt();
  }

  public async isValidMsaId(msaId: string): Promise<boolean> {
    const msaIdMax = await this.getMsaIdMax();
    return BigInt(msaId) > 0n && BigInt(msaId) <= msaIdMax;
  }

  public async getKeysByMsa(msaId: string): Promise<KeyInfoResponse | null> {
    return this.handleOptionResult(this.api.rpc.msa.getKeysByMsaId(msaId), `No keys found for msaId: ${msaId}`);
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

  public async capacityInfo(providerId: AnyNumber): Promise<ICapacityInfo> {
    await this.isReady();
    const epochStart = await this.getCurrentCapacityEpochStart();
    const epochBlockLength = await this.getCurrentEpochLength();
    const capacityDetailsOption: Option<PalletCapacityCapacityDetails> =
      await this.api.query.capacity.capacityLedger(providerId);
    const { remainingCapacity, totalCapacityIssued } = capacityDetailsOption.unwrapOr({
      remainingCapacity: new u128(this.api.registry, 0),
      totalCapacityIssued: new u128(this.api.registry, 0),
    });
    const currentBlockNumber = (await this.api.query.system.number()).toNumber();
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

  public async getCurrentCapacityEpoch(): Promise<number> {
    return (await this.api.query.capacity.currentEpoch()).toNumber();
  }

  public async getCurrentCapacityEpochStart(): Promise<number> {
    return (await this.api.query.capacity.currentEpochInfo()).epochStart.toNumber();
  }

  public async getCurrentEpochLength(): Promise<number> {
    return (await this.api.query.capacity.epochLength()).toNumber();
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

    return {} as ItemizedPageUpdated;
  }

  public async validateProviderSeedPhrase() {
    const { providerSeedPhrase, providerId } = this.config;
    if (providerSeedPhrase) {
      const address = await addressFromSeedPhrase(providerSeedPhrase);
      const resolvedProviderId = await this.publicKeyToMsaId(address);

      if (resolvedProviderId !== providerId.toString()) {
        throw new Error(
          `Provided account secret maps to public key ${address}, which does not match configured Provider ID (${providerId.toString()})`,
        );
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

  public async payWithCapacity(
    tx: Call | IMethod | string | Uint8Array,
  ): Promise<[SubmittableExtrinsic<'promise'>, HexString]> {
    const extrinsic = this.api.tx.frequencyTxPayment.payWithCapacity(tx);
    const keys = new Keyring({ type: 'sr25519' }).createFromUri(this.config.providerSeedPhrase);
    const nonce = await this.getNextNonce();
    this.logger.debug(`Capacity Wrapped Extrinsic: ${extrinsic.toHuman()}, nonce: ${nonce}`);
    const txHash = await extrinsic.signAndSend(keys.address, { nonce });
    if (!txHash) {
      throw new Error('Tx hash is undefined');
    }
    this.logger.debug(`Tx hash: ${txHash}`);
    return [extrinsic, txHash.toHex()];
  }

  public async payWithCapacityBatchAll(
    tx: Vec<Call> | (Call | IMethod | string | Uint8Array)[],
  ): Promise<[SubmittableExtrinsic<'promise'>, HexString]> {
    const extrinsic = this.api.tx.frequencyTxPayment.payWithCapacityBatchAll(tx);
    const keys = new Keyring({ type: 'sr25519' }).createFromUri(this.config.providerSeedPhrase);
    const nonce = await this.getNextNonce();
    this.logger.debug(`Capacity Wrapped Extrinsic: ${extrinsic.toHuman()}, nonce: ${nonce}`);
    const txHash = await extrinsic.signAndSend(keys.address, { nonce });
    if (!txHash) {
      throw new Error('Tx hash is undefined');
    }
    this.logger.debug(`Tx hash: ${txHash}`);
    return [extrinsic, txHash.toHex()];
  }

  public async retireMsa() {
    return this.api.tx.msa.retireMsa();
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

  public async getNextNonce(): Promise<number> {
    const nonce = await this.getNonce(this.accountId);
    const keys = getNextPossibleNonceKeys(nonce);
    // @ts-ignore
    const nextNonceIndex = await this.nonceRedis.incrementNonce(...keys, keys.length, NONCE_KEY_EXPIRE_SECONDS);
    if (nextNonceIndex === -1) {
      this.logger.warn(`nextNonce was full even with ${NUMBER_OF_NONCE_KEYS_TO_CHECK} ${nonce}`);
      return nonce + NUMBER_OF_NONCE_KEYS_TO_CHECK;
    }
    const nextNonce = Number(nonce) + nextNonceIndex - 1;
    this.logger.debug(`nextNonce ${nextNonce}`);
    return nextNonce;
  }
}
