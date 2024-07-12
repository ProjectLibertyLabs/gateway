/* eslint-disable no-underscore-dangle */
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { options } from '@frequency-chain/api-augment';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { BlockHash, BlockNumber, Event, SignedBlock } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { AnyNumber, ISubmittableResult } from '@polkadot/types/types';
import { u32, Option, Bytes } from '@polkadot/types';
import {
  CommonPrimitivesHandlesClaimHandlePayload,
  CommonPrimitivesMsaDelegation,
  FrameSystemEventRecord,
  PalletCapacityCapacityDetails,
  PalletCapacityEpochInfo,
  PalletSchemasSchemaInfo,
} from '@polkadot/types/lookup';
import { HandleResponse, KeyInfoResponse } from '@frequency-chain/api-augment/interfaces';
import { ConfigService } from '#lib/config/config.service';
import { TransactionType } from '#lib/types/enums';
import { HexString } from '@polkadot/util/types';
import { decodeAddress } from '@polkadot/util-crypto';
import { KeysRequest } from '#lib/types/dtos/keys.request.dto';
import { PublishHandleRequest } from '#lib/types/dtos/handles.request.dto';
import { TransactionData } from '#lib/types/dtos/transaction.request.dto';
import { Extrinsic } from './extrinsic';

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

@Injectable()
export class BlockchainService implements OnApplicationBootstrap, OnApplicationShutdown {
  public api: ApiPromise;

  private configService: ConfigService;

  private logger: Logger;

  public async onApplicationBootstrap() {
    const providerUrl = this.configService.frequencyUrl!;
    let provider: WsProvider | HttpProvider;
    if (/^ws/.test(providerUrl.toString())) {
      provider = new WsProvider(providerUrl.toString());
    } else if (/^http/.test(providerUrl.toString())) {
      provider = new HttpProvider(providerUrl.toString());
    } else {
      this.logger.error(`Unrecognized chain URL type: ${providerUrl.toString()}`);
      throw new Error('Unrecognized chain URL type');
    }
    this.api = await ApiPromise.create({ provider, ...options }).then((api) => api.isReady);
    this.logger.log('Blockchain API ready.');
  }

  public async isReady(): Promise<boolean> {
    await this.api?.isReady;
    return true;
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

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.logger = new Logger(this.constructor.name);
  }

  public getBlockHash(block: BlockNumber | AnyNumber): Promise<BlockHash> {
    return this.api.rpc.chain.getBlockHash(block);
  }

  public getBlock(block: BlockHash): Promise<SignedBlock> {
    return this.api.rpc.chain.getBlock(block);
  }

  public async getBlockByNumber(blockNumber: number): Promise<SignedBlock> {
    const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
    return this.api.rpc.chain.getBlock(blockHash);
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

  public async getNonce(account: Uint8Array): Promise<number> {
    return this.rpc('system', 'accountNextIndex', account);
  }

  public async getSchema(schemaId: number): Promise<PalletSchemasSchemaInfo> {
    const schema: PalletSchemasSchemaInfo = await this.query('schemas', 'schemas', schemaId);
    return schema;
  }

  /**
   * Return the current maximum MSA ID.
   *
   * NOTE: in most other places we treat MSA ID as a string to eliminate
   * portability problems with `bigint`, but here we explicitly return it
   * as a `bigint` because the return value of this function is used almost
   * exclusively in the context of a mathematical comparison.
   *
   * @returns {bigint} The current maximum MSA ID from the chain
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

  public async getKeysByMsa(msaId: string): Promise<KeyInfoResponse> {
    const keyInfoResponse = await this.api.rpc.msa.getKeysByMsaId(msaId);
    if (keyInfoResponse.isSome) {
      return keyInfoResponse.unwrap();
    }
    throw new Error(`No keys found for msaId: ${msaId}`);
  }

  public async addPublicKeyToMsa(keysRequest: KeysRequest): Promise<SubmittableExtrinsic<any>> {
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

  public async publishHandle(jobData: TransactionData<PublishHandleRequest>) {
    const handleVec = new Bytes(this.api.registry, jobData.payload.baseHandle);
    const claimHandlePayload: CommonPrimitivesHandlesClaimHandlePayload = this.api.registry.createType(
      'CommonPrimitivesHandlesClaimHandlePayload',
      {
        baseHandle: handleVec,
        expiration: jobData.payload.expiration,
      },
    );

    this.logger.debug(`claimHandlePayload: ${claimHandlePayload}`);
    this.logger.debug(`accountId: ${jobData.accountId}`);

    const claimHandleProof: Sr25519Signature = { Sr25519: jobData.proof };
    this.logger.debug(`claimHandleProof: ${JSON.stringify(claimHandleProof)}`);

    switch (jobData.type) {
      case TransactionType.CREATE_HANDLE:
        return this.api.tx.handles.claimHandle(jobData.accountId, claimHandleProof, claimHandlePayload);
      case TransactionType.CHANGE_HANDLE:
        return this.api.tx.handles.changeHandle(jobData.accountId, claimHandleProof, claimHandlePayload);
      default:
        throw new Error(`Unrecognized transaction type: ${(jobData as any).type}`);
    }
  }

  public async getHandleForMsa(msaId: AnyNumber): Promise<HandleResponse | null> {
    const handleResponse = await this.rpc('handles', 'getHandleForMsa', msaId.toString());
    if (handleResponse.isSome) {
      return handleResponse.unwrap();
    }
    this.logger.error(`getHandleForMsa: No handle found for msaId: ${msaId}`);
    return null;
  }

  public async getCommonPrimitivesMsaDelegation(
    msaId: AnyNumber,
    providerId: AnyNumber,
  ): Promise<CommonPrimitivesMsaDelegation | null> {
    const delegationResponse = await this.api.query.msa.delegatorAndProviderToDelegation(msaId, providerId);
    if (delegationResponse.isSome) return delegationResponse.unwrap();
    return null;
  }

  public async publicKeyToMsaId(publicKey: string) {
    this.logger.log(`Public Key To Msa`);

    const handleResponse = await this.query('msa', 'publicKeyToMsaId', publicKey);
    this.logger.log(`Public Key To Msa`, handleResponse.unwrap());

    if (handleResponse.isSome) return handleResponse.unwrap();
    this.logger.log(`Public Key To Msa`);

    return null;
  }

  public async capacityInfo(providerId: AnyNumber): Promise<{
    providerId: string;
    currentBlockNumber: number;
    nextEpochStart: number;
    remainingCapacity: bigint;
    totalCapacityIssued: bigint;
    currentEpoch: bigint;
  }> {
    const providerU64 = this.api.createType('u64', providerId);
    const { epochStart }: PalletCapacityEpochInfo = await this.query('capacity', 'currentEpochInfo');
    const epochBlockLength: u32 = await this.query('capacity', 'epochLength');
    const capacityDetailsOption: Option<PalletCapacityCapacityDetails> = await this.query(
      'capacity',
      'capacityLedger',
      providerU64,
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

  public async getCurrentCapacityEpoch(): Promise<bigint> {
    const currentEpoch: u32 = await this.query('capacity', 'currentEpoch');
    return typeof currentEpoch === 'number' ? BigInt(currentEpoch) : currentEpoch.toBigInt();
  }

  public async getCurrentCapacityEpochStart(): Promise<u32> {
    const currentEpochInfo: PalletCapacityEpochInfo = await this.query('capacity', 'currentEpochInfo');
    return currentEpochInfo.epochStart;
  }

  public async getCurrentEpochLength(): Promise<number> {
    const epochLength: u32 = await this.query('capacity', 'epochLength');
    return typeof epochLength === 'number' ? epochLength : epochLength.toNumber();
  }

  /**
   * Handles the result of a SIWF transaction by extracting relevant values from the transaction events.
   * @param txResultEvents - The transaction result events to process.
   * @returns An object containing the extracted SIWF transaction values.
   */
  public handleSIWFTxnResult(txResultEvents: FrameSystemEventRecord[]): SIWFTxnValues {
    const siwfTxnValues: Partial<SIWFTxnValues> = {};

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
      }
      if (record.event && this.api.events.msa.DelegationGranted.is(record.event)) {
        siwfTxnValues.newProvider = record.event.data.providerId.toString();
        const owner = record.event.data.delegatorId.toString();
      }
    });
    return siwfTxnValues as SIWFTxnValues;
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
   * @returns {PublicKeyValues} An object containing the MSA ID & new public key
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
}
