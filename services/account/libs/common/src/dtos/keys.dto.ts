import { KeyringPair } from '@polkadot/keyring/types';

export class KeysResponse {
  dsnpId: string;
  keys: KeyringPair;
}
