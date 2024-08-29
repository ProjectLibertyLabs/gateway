import { Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';

const keyring: Keyring = new Keyring({ type: 'sr25519' });

export function createKeys(uri: string): KeyringPair {
  return keyring.createFromUri(uri);
}
