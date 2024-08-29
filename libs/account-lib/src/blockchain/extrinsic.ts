import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Hash } from '@polkadot/types/interfaces';
import { ISubmittableResult } from '@polkadot/types/types';
import { KeyringPair } from '@polkadot/keyring/types';

export class Extrinsic<T extends ISubmittableResult = ISubmittableResult> {
  public readonly extrinsic: SubmittableExtrinsic<'promise', T>;

  private keys: KeyringPair;

  public api: ApiPromise;

  constructor(api: ApiPromise, extrinsic: SubmittableExtrinsic<'promise', T>, keys: KeyringPair) {
    this.extrinsic = extrinsic;
    this.keys = keys;
    this.api = api;
  }

  public async signAndSend(nonce?: number): Promise<Hash> {
    return this.extrinsic.signAndSend(this.keys, { nonce });
  }
}
