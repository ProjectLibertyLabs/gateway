import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Call, Hash } from '@polkadot/types/interfaces';
import { ISubmittableResult } from '@polkadot/types/types';
import { KeyringPair } from '@polkadot/keyring/types';

export class Extrinsic<T extends ISubmittableResult = ISubmittableResult> {
  private extrinsic: SubmittableExtrinsic<'promise', T>;

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

  public getCall(): Call {
    const call = this.api.createType('Call', this.extrinsic);
    return call;
  }
}
