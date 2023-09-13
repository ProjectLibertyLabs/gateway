import { Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';

// eslint-disable-next-line import/no-mutable-exports
export let keyring: Keyring;

export function createKeys(uri: string): KeyringPair {
  if (!keyring) {
    keyring = new Keyring({ type: 'sr25519' });
  }

  const keys = keyring.addFromUri(uri);

  return keys;
}
