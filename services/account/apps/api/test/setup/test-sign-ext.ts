import { ExtrinsicHelper, initialize } from '@projectlibertylabs/frequency-scenario-template';
import log from 'loglevel';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';
import { SignerPayloadJSON } from '@polkadot/types/types';

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
  await cryptoWaitReady();
  const aliceKeys = new Keyring({ type: 'sr25519' }).createFromUri('//Alice');

  // @ts-ignore
  // eslint-disable-next-line consistent-return
  const getRawPayloadForSigning = async (tx: any, signerAddress: string) => {
    let signRaw;
    try {
      await tx.signAsync(signerAddress, {
        signer: {
          signRaw: (raw) => {
            signRaw = raw;
            throw new Error('Stop here');
          },
        },
      });
    } catch (_e) {
      return signRaw;
    }
  };

  const tx = ExtrinsicHelper.apiPromise.tx.msa.retireMsa();
  const encodedTx = tx.toHex();

  const unsignedPayload = await getRawPayloadForSigning(tx, aliceKeys.address);

  console.log('unsignedPayload', unsignedPayload);

  const encodedPayload = ExtrinsicHelper.apiPromise.createType('ExtrinsicPayload', unsignedPayload, {
    version: ExtrinsicHelper.apiPromise.extrinsicVersion,
  });
  console.log('encodedPayload', encodedPayload.toHex());

  const { signature } = encodedPayload.sign(aliceKeys);

  const transaction = ExtrinsicHelper.apiPromise.tx(encodedTx);

  console.log('Sending transaction with signature:', signature);

  transaction.addSignature(aliceKeys.addressRaw, signature, unsignedPayload);

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