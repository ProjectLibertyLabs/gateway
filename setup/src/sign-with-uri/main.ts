import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { hexToU8a, u8aToHex, u8aWrapBytes } from '@polkadot/util';
import readlineSync from 'readline-sync';
import minimist from 'minimist';

/**
 * Sign a payload using keys derived from an input seed phrase/URI
 * This is a raw (non-byte-wrapped) signature, useful for signing extrinsics.
 * If a byte-wrapped signature is desired, it can be generated by:
 *     - Invoke this script with `--wrapBytes`
 *     - Using the PolkadotJS UI "Sign and Verify" utility
 *     - Byte-wrapping the input payload first
 */
async function main() {
  await cryptoWaitReady();

  const args = minimist(process.argv.slice(2), { boolean: true });

  let [payload, mnemonicUri] = args._;

  if (!payload) {
    payload = readlineSync.question('Payload to sign (hex-encoded): ');
    if (args.wrapBytes) {
      console.info('Byte-wrapping payload');
      payload = u8aToHex(u8aWrapBytes(hexToU8a(payload)));
    }
  }

  if (!mnemonicUri) {
    mnemonicUri = readlineSync.question('Seed phrase/URI to sign with: ', { hideEchoBack: true });
  }

  const keypair = new Keyring({ type: 'sr25519' }).createFromUri(mnemonicUri);

  const signature = u8aToHex(keypair.sign(payload, { withType: true }));

  console.log('Signed payload: ', {
    payload,
    address: keypair.address,
    signature,
  });
}

main().catch((e) => console.error(e));
