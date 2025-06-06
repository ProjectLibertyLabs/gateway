/* eslint-disable new-cap */
/* eslint-disable no-underscore-dangle */
/*
 * NOTE: This class is designed to isolate consumers from having to deal with the details of interacting directly
 *       with the Frequency blockchain. To that end, return values of functions should not expose the SCALE-
 *       encoded objects that are directly returned from Frequency RPC calls; rather, all payloads should be
 *       unwrapped and re-formed using native Javascript types.
 *
 *       RPC methods that have the potential to return values wrapped as `Option<...>` or any value supporting
 *       the `.isEmpty`, `.isSome`, or `.isNone` getters should implement one of the following behaviors:
 *          - have a specified return type of `<type> | null` and return null for an empty value
 *          - return some sane default for an empty value
 *          - throw an error if an empty value is encountered
 */
import fs from 'fs';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Keyring } from '@polkadot/api';
import { Call } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { IMethod, ISubmittableResult } from '@polkadot/types/types';
import { Vec } from '@polkadot/types';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { HexString } from '@polkadot/util/types';
import {
  FALLBACK_MAX_HASH_COUNT,
  FALLBACK_PERIOD,
  MAX_FINALITY_LAG,
  MORTAL_PERIOD,
} from '@polkadot/api-derive/tx/constants';
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from './blockchain.config';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { BlockchainRpcQueryService } from './blockchain-rpc-query.service';
import { NonceConstants } from '#types/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadSignatureError,
  InsufficientBalanceError,
  MortalityError,
  NonceConflictError,
  RpcError,
  SIWFTxnValues,
} from './types';
import { BN } from '@polkadot/util';

export const NONCE_SERVICE_REDIS_NAMESPACE = 'NonceService';

export type Sr25519Signature = { Sr25519: HexString };

export interface IHeaderInfo {
  blockHash: HexString;
  number: number;
  parentHash: HexString;
}

const { NUMBER_OF_NONCE_KEYS_TO_CHECK, NONCE_KEY_EXPIRE_SECONDS, getNonceKey } = NonceConstants;

function getNextPossibleNonceKeys(currentNonce: string | number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < NUMBER_OF_NONCE_KEYS_TO_CHECK; i += 1) {
    const key = Number(currentNonce) + i;
    keys.push(getNonceKey(`${key}`));
  }
  return keys;
}

@Injectable()
export class BlockchainService extends BlockchainRpcQueryService implements OnApplicationBootstrap {
  private accountId: string;

  private readyResolve: (arg: boolean) => void;

  private readyReject: (reason: any) => void;

  private readonly headerInterval: NodeJS.Timeout;

  private isReadyPromise = new Promise<boolean>((resolve, reject) => {
    this.readyResolve = resolve;
    this.readyReject = reject;
  });

  public async onApplicationBootstrap() {
    try {
      await this.baseIsReadyPromise;
      await this.validateProviderSeedPhrase();
      this.accountId = await addressFromSeedPhrase(this.config.providerSeedPhrase);
      // PolkadotJSAPI still uses NestJS logger for now
      this.logger.log('Blockchain provider keys validated.');
      this.readyResolve(true);
    } catch (err) {
      this.readyReject(err);
      throw err;
    }
  }

  public async onApplicationShutdown() {
    clearInterval(this.headerInterval);
    super.onApplicationShutdown();
  }

  public async isReady(): Promise<boolean> {
    return (await this.baseIsReadyPromise) && (await this.isReadyPromise) && !!(await this.api.isReady);
  }

  public async updateLatestBlockHeader() {
    const latestHeader = await this.api.rpc.chain.getHeader();
    const latestFinalizedBlock = await this.api.rpc.chain.getFinalizedHead();
    const latestFinalizedHeader = await this.api.rpc.chain.getHeader(latestFinalizedBlock);
    await this.defaultRedis
      .multi()
      .set(
        'latestHeader',
        JSON.stringify({
          blockHash: latestHeader.hash.toHex(),
          number: latestHeader.number.toNumber(),
          parentHash: latestHeader.parentHash.toHex(),
        }),
      )
      .set(
        'latestFinalizedHeader',
        JSON.stringify({
          blockHash: latestFinalizedHeader.hash.toHex(),
          number: latestFinalizedHeader.number.toNumber(),
          parentHash: latestFinalizedHeader.parentHash.toHex(),
        }),
      )
      .exec();
  }

  constructor(
    @Inject(blockchainConfig.KEY) private readonly config: IBlockchainConfig,
    @InjectRedis() private readonly defaultRedis: Redis,
    @InjectRedis(NONCE_SERVICE_REDIS_NAMESPACE) private readonly nonceRedis: Redis,
    eventEmitter: EventEmitter2,
  ) {
    super(config, eventEmitter);
    if (!this.nonceRedis) throw new Error('Unable to get NonceRedis');
    this.nonceRedis.defineCommand('incrementNonce', {
      numberOfKeys: NUMBER_OF_NONCE_KEYS_TO_CHECK,
      lua: fs.readFileSync('lua/incrementNonce.lua', 'utf8'),
    });

    this.headerInterval = setInterval(() => this.updateLatestBlockHeader(), this.blockTimeMs);
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

  public static createError(err: any): any {
    if (err?.name === 'RpcError') {
      if (/Priority is too low/.test(err?.message)) {
        return new NonceConflictError(err);
      }

      if (/Transaction has a bad signature/.test(err?.message)) {
        return new BadSignatureError(err);
      }

      if (/Inability to pay some fees/.test(err?.message)) {
        return new InsufficientBalanceError(err);
      }

      if (/Transaction has an ancient birth block/.test(err?.message)) {
        return new MortalityError(err);
      }

      return new RpcError(err);
    }

    return err;
  }

  /**
   * Submits a transaction to the blockchain, paying for it with the provider's capacity.
   * @param tx
   * @returns [extrinsic, txHash, submittedBlockNumber]
   */
  public async payWithCapacity(
    tx: Call | IMethod | string | Uint8Array,
  ): Promise<[SubmittableExtrinsic<'promise'>, HexString, number]> {
    const extrinsic = this.api.tx.frequencyTxPayment.payWithCapacity(tx);
    const keys = new Keyring({ type: 'sr25519' }).createFromUri(this.config.providerSeedPhrase);
    const nonce = await this.reserveNextNonce();
    const block = await this.getBlockForSigning();
    const blockHash = this.api.createType('Hash', block.blockHash);
    const era = this.api.createType('ExtrinsicEra', { current: block.number, period: this.defaultMortalityPeriod });
    try {
      this.logger.debug(`Capacity Wrapped Extrinsic: ${JSON.stringify(extrinsic.toHuman())}, nonce: ${nonce}`);
      const txHash = await extrinsic.signAndSend(keys, { nonce, blockHash, era });
      if (!txHash) {
        throw new Error('Tx hash is undefined');
      }
      this.logger.debug(`Tx hash: ${txHash}`);
      return [extrinsic, txHash.toHex(), block.number];
    } catch (err: any) {
      await this.unreserveNonce(nonce);
      throw BlockchainService.createError(err);
    }
  }

  /**
   * Submits a batch of transactions to the blockchain, paying for them with the provider's capacity.
   * @param tx[]
   * @returns [extrinsic, txHash, submittedBlockNumber]
   */
  public async payWithCapacityBatchAll(
    tx: Vec<Call> | (Call | IMethod | string | Uint8Array)[],
  ): Promise<[SubmittableExtrinsic<'promise'>, HexString, number]> {
    const extrinsic = this.api.tx.frequencyTxPayment.payWithCapacityBatchAll(tx);
    const keys = new Keyring({ type: 'sr25519' }).createFromUri(this.config.providerSeedPhrase);
    const nonce = await this.reserveNextNonce();
    const block = await this.getBlockForSigning();
    const blockHash = this.api.createType('Hash', block.blockHash);
    const era = this.api.createType('ExtrinsicEra', { current: block.number, period: this.defaultMortalityPeriod });
    try {
      this.logger.debug(`Capacity Wrapped Extrinsic: ${JSON.stringify(extrinsic.toHuman())}, nonce: ${nonce}`);
      const txHash = await extrinsic.signAndSend(keys, { nonce, blockHash, era });
      if (!txHash) {
        throw new Error('Tx hash is undefined');
      }
      this.logger.debug(`Tx hash: ${txHash.toString()}`);
      return [extrinsic, txHash.toHex(), block.number];
    } catch (err: any) {
      await this.unreserveNonce(nonce);
      throw BlockchainService.createError(err);
    }
  }

  public async reserveNextNonce(): Promise<number> {
    const currentNonceKey = getNonceKey('current');
    let nonce: string | number = await this.nonceRedis.get(currentNonceKey);
    if (!nonce) {
      nonce = await this.getNonce(this.accountId);
      await this.nonceRedis.setex(currentNonceKey, NONCE_KEY_EXPIRE_SECONDS / 2, nonce);
    }
    const keys = getNextPossibleNonceKeys(nonce);
    // @ts-ignore
    const nextNonceIndex = await this.nonceRedis.incrementNonce(...keys, keys.length, NONCE_KEY_EXPIRE_SECONDS);
    if (nextNonceIndex === -1) {
      this.logger.warn(`nextNonce was full even with ${NUMBER_OF_NONCE_KEYS_TO_CHECK} ${nonce}`);
      return Number(nonce) + NUMBER_OF_NONCE_KEYS_TO_CHECK;
    }
    const nextNonce = Number(nonce) + nextNonceIndex - 1;
    this.logger.debug(`nextNonce ${nextNonce}`);
    return nextNonce;
  }

  public unreserveNonce(nonce: number) {
    return this.nonceRedis.del(getNonceKey(`${nonce}`));
  }

  public createTxFromEncoded(encodedTx: any): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return this.api.tx(encodedTx);
  }

  /**
   * Gets the block hash and number of the latest block for signing. We cache this info & update asynchronously. This
   * eliminates unnecessary RPC calls to get the latest block info, since it's okay if we're a little behind in the block number/hash we
   * use for signing and mortality checking.
   * @returns The block hash & number of the latest finalized block if the finality lag is greater than the maximum allowed, otherwise the block hash of the latest block.
   */
  public async getBlockForSigning(): Promise<IHeaderInfo> {
    let [latestHeaderStr, finalizedHeaderStr] = await this.defaultRedis.mget(['latestHeader', 'latestFinalizedHeader']);

    if (!latestHeaderStr || !finalizedHeaderStr) {
      await this.updateLatestBlockHeader();
      [latestHeaderStr, finalizedHeaderStr] = await this.defaultRedis.mget(['latestHeader', 'latestFinalizedHeader']);
    }

    if (!latestHeaderStr || !finalizedHeaderStr) {
      throw new Error('Unable to get latest block header info');
    }

    const latestHeader = JSON.parse(latestHeaderStr) as IHeaderInfo;
    const finalizedHeader = JSON.parse(finalizedHeaderStr) as IHeaderInfo;

    return latestHeader.number - finalizedHeader.number > MAX_FINALITY_LAG.toNumber() ? latestHeader : finalizedHeader;
  }

  /**
   * Gets default mortality period for transactions.
   * From: https://github.com/polkadot-js/api/blob/a5c5f76aee54622d004c6b4342040e8c9d149d1e/packages/api-derive/src/tx/signingInfo.ts#L117
   * @returns The default mortality period for transactions.
   */
  public get defaultMortalityPeriod(): number {
    return Math.min(
      this.api.consts.system?.blockHashCount?.toNumber() || FALLBACK_MAX_HASH_COUNT,
      MORTAL_PERIOD.div(new BN(this.blockTimeMs) || FALLBACK_PERIOD)
        .iadd(MAX_FINALITY_LAG)
        .toNumber(),
    );
  }
}
