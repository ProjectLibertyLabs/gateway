// Only way to silence PolkadotJS API warnings we don't want
console.warn = () => {};

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { u8aToHex, u8aWrapBytes } from '@polkadot/util';

export async function getApi() {
  const api = await ApiPromise.create({
    // Using mainnet as: 1. Nothing here would use local only metadata, 2. We aren't actually submitting.
    provider: new WsProvider('wss://0.rpc.frequency.xyz'),
  });
  await api.isReady;
  return api;
}

export function createKey() {
  const mnemonic = mnemonicGenerate();
  const keyring = new Keyring({ type: 'sr25519' });
  const keypair = keyring.createFromUri(mnemonic);
  return keypair;
}

export function signPayloadSr25519(keys, data) {
  return { Sr25519: u8aToHex(keys.sign(u8aWrapBytes(data.toU8a()))) };
}
