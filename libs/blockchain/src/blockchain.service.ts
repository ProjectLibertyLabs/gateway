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
import blockchainConfig, { addressFromSeedPhrase, IBlockchainConfig } from './blockchain.config';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { BlockchainRpcQueryService } from './blockchain-rpc-query.service';
import { NonceConstants } from '#types/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DelayedError } from 'bullmq';
import { SIWFTxnValues } from './types';

export const NONCE_SERVICE_REDIS_NAMESPACE = 'NonceService';

export type Sr25519Signature = { Sr25519: HexString };

const { NUMBER_OF_NONCE_KEYS_TO_CHECK, NONCE_KEY_EXPIRE_SECONDS, getNonceKey } = NonceConstants;

function getNextPossibleNonceKeys(account: string, currentNonce: string | number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < NUMBER_OF_NONCE_KEYS_TO_CHECK; i += 1) {
    const key = Number(currentNonce) + i;
    keys.push(getNonceKey(account, `${key}`));
  }
  return keys;
}
@Injectable()
export class BlockchainService extends BlockchainRpcQueryService implements OnApplicationBootstrap {
  private accountId: string;

  private readyResolve: (arg: boolean) => void;

  private readyReject: (reason: any) => void;

  private isReadyPromise = new Promise<boolean>((resolve, reject) => {
    this.readyResolve = resolve;
    this.readyReject = reject;
  });

  public async onApplicationBootstrap() {
    try {
      await this.baseIsReadyPromise;
      await this.validateProviderSeedPhrase();
      this.accountId = await addressFromSeedPhrase(this.config.providerSeedPhrase);
      this.logger.log('Blockchain provider keys validated.');
      this.readyResolve(true);
    } catch (err) {
      this.readyReject(err);
      throw err;
    }
  }

  public async isReady(): Promise<boolean> {
    return (await this.baseIsReadyPromise) && (await this.isReadyPromise) && !!(await this.api.isReady);
  }

  constructor(
    @Inject(blockchainConfig.KEY) private readonly config: IBlockchainConfig,
    @InjectRedis(NONCE_SERVICE_REDIS_NAMESPACE) private readonly nonceRedis: Redis,
    eventEmitter: EventEmitter2,
  ) {
    super(config, eventEmitter);
    if (!this.nonceRedis) throw new Error('Unable to get NonceRedis');
    this.nonceRedis.defineCommand('incrementNonce', {
      numberOfKeys: NUMBER_OF_NONCE_KEYS_TO_CHECK,
      lua: fs.readFileSync('lua/incrementNonce.lua', 'utf8'),
    });
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

  public async payWithCapacity(
    tx: Call | IMethod | string | Uint8Array,
  ): Promise<[SubmittableExtrinsic<'promise'>, HexString]> {
    const extrinsic = this.api.tx.frequencyTxPayment.payWithCapacity(tx);
    const outOfCapacity = await this.checkTxCapacityLimit(this.config.providerId, extrinsic.toHex());
    if (outOfCapacity) {
      throw new DelayedError();
    }
    const keys = new Keyring({ type: 'sr25519' }).createFromUri(this.config.providerSeedPhrase);
    const nonce = await this.getNextNonce();
    this.logger.debug(`Capacity Wrapped Extrinsic: ${JSON.stringify(extrinsic.toHuman())}, nonce: ${nonce}`);
    const txHash = await extrinsic.signAndSend(keys, { nonce });
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
    const outOfCapacity = await this.checkTxCapacityLimit(this.config.providerId, extrinsic.toHex());
    if (outOfCapacity) {
      throw new DelayedError();
    }
    const keys = new Keyring({ type: 'sr25519' }).createFromUri(this.config.providerSeedPhrase);
    const nonce = await this.getNextNonce();
    this.logger.debug(`Capacity Wrapped Extrinsic: ${JSON.stringify(extrinsic.toHuman())}, nonce: ${nonce}`);
    const txHash = await extrinsic.signAndSend(keys, { nonce });
    if (!txHash) {
      throw new Error('Tx hash is undefined');
    }
    this.logger.debug(`Tx hash: ${txHash.toString()}`);
    return [extrinsic, txHash.toHex()];
  }

  public async getNextNonce(): Promise<number> {
    const currentNonceKey = getNonceKey(this.accountId, 'current');
    let nonce: string | number = await this.nonceRedis.get(currentNonceKey);
    if (!nonce) {
      nonce = await this.getNonce(this.accountId);
      await this.nonceRedis.setex(currentNonceKey, NONCE_KEY_EXPIRE_SECONDS, nonce);
    }
    const keys = getNextPossibleNonceKeys(this.accountId, nonce);
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

  public createTxFromEncoded(encodedTx: any): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return this.api.tx(encodedTx);
  }
}
