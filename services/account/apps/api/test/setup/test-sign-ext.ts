import { ExtrinsicHelper, initialize } from '@projectlibertylabs/frequency-scenario-template';
import log from 'loglevel';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';

const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://127.0.0.1:9944';

async function main() {
  await cryptoWaitReady();
  console.log('Connecting...');
  await initialize(FREQUENCY_URL);
  log.setLevel('trace');

  // eslint-disable-next-line no-use-before-define
  await retireMsa();
}

async function retireMsa() {
  const aliceKeys = new Keyring({ type: 'sr25519' }).createFromUri('//Alice');

  const tx = ExtrinsicHelper.apiPromise.tx.msa.retireMsa();
  // generate SignerPayload
  // const signerPayload = ExtrinsicHelper.apiPromise.createType('SignerPayload', {
  //   address: aliceKeys.address,
  //   genesisHash: ExtrinsicHelper.apiPromise.genesisHash,
  //   method: tx,
  //   runtimeVersion: ExtrinsicHelper.apiPromise.runtimeVersion,
  //   // tip: tip,
  //   version: ExtrinsicHelper.apiPromise.extrinsicVersion,
  //   // nonce,
  //   // blockHash: api.genesisHash,
  // });
  const signerPayload: any = tx.registry.createTypeUnsafe('SignerPayload', [
    tx,
    { version: ExtrinsicHelper.apiPromise.extrinsicVersion },
  ]);
  const encodedTx = tx.toHex();

  // generate ExtrinsicPayload
  const ExtrinsicPayload = ExtrinsicHelper.apiPromise.createType('ExtrinsicPayload', signerPayload.toPayload(), {
    version: ExtrinsicHelper.apiPromise.extrinsicVersion,
  });

  console.log('ExtrinsicPayload', ExtrinsicPayload.toHex());

  const { signature } = ExtrinsicPayload.sign(aliceKeys);
  const transaction = ExtrinsicHelper.apiPromise.tx(encodedTx);
  console.log('Sending transaction with signature:', signature);
  transaction.addSignature(aliceKeys.addressRaw, signature, signerPayload.toPayload());
  await new Promise<void>((resolve, reject) => {
    transaction.send(({ status, dispatchError }) => {
      if (dispatchError) {
        console.error('ERROR: ', dispatchError.toHuman());
        reject(dispatchError.toJSON());
      } else if (status.isInBlock || status.isFinalized) {
        console.log('SUCCESS!');
        resolve();
      } else {
        console.log('STATUS: ', status.toHuman());
      }
    });
  });
}

main()
  .catch((r) => {
    console.error(r);
    process.exit(1);
  })
  .finally(process.exit);
