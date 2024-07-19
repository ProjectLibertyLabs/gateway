import { Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';

export let keyring: Keyring;

export function createKeys(uri: string): KeyringPair {
  if (!keyring) {
    keyring = new Keyring({ type: 'sr25519' });
  }

  const keys = keyring.addFromUri(uri);

  return keys;
}
