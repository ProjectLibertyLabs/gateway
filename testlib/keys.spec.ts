import { KeyringPair } from '@polkadot/keyring/types';
import { Keypair, KeypairType } from '@polkadot/util-crypto/types';
import { mnemonicGenerate, secp256k1PairFromSeed } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import { keccak256 } from 'ethers';
import Keyring from '@polkadot/keyring';

// copied from frequency-chain/frequency repo
// Create a keypair and return it as KeyringPair and optionally a Keypair for ethereum signing.
export const createKeys = (keyType: KeypairType = 'sr25519'): { keyringPair: KeyringPair; keypair?: Keypair } => {
  const mnemonic = mnemonicGenerate(12);
  const keyring = new Keyring({ type: keyType });
  let keyringPair: KeyringPair;
  let keypair: Keypair;
  if (keyType === 'ethereum') {
    // since we don't have access to the secret key from inside the KeyringPair
    keypair = secp256k1PairFromSeed(hexToU8a(keccak256(Buffer.from(mnemonic, 'utf8'))));
    keyringPair = keyring.addFromPair(keypair, {}, keyType);
  } else {
    keyringPair = keyring.addFromUri(mnemonic, {}, 'sr25519');
  }
  return { keyringPair, keypair };
};
