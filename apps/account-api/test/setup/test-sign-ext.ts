import { ExtrinsicHelper, initialize } from '@projectlibertylabs/frequency-scenario-template';
import log from 'loglevel';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { SignerResult, Signer } from '@polkadot/types/types';

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
  const getRawPayloadForSigning = async (tx: any, signerAddress: string): Promise<SignerPayloadRaw> => {
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

  const getSignerForRawSignature = (result: SignerResult): Signer => ({
    signRaw: () => Promise.resolve(result),
  });

  const tx = ExtrinsicHelper.apiPromise.tx.msa.retireMsa();

  const payload = await getRawPayloadForSigning(tx, aliceKeys.address);

  console.log('payload:', payload);

  const { data } = payload;
  console.log('data:', data);

  // TODO: make into signer result
  const sig: SignerResult = { id: 1, signature: u8aToHex(aliceKeys.sign(data)) };
  console.log('sig:', sig);

  const signer = getSignerForRawSignature(sig);
  console.log('signer:', signer);

  const transaction = await tx.signAsync(aliceKeys.address, { signer });

  console.log('did it sign???');
  // const transaction = await ExtrinsicHelper.apiPromise.tx();

  // console.log('Sending transaction with signature:', u8aToHex(signature));

  // transaction.addSignature(aliceKeys.addressRaw, signature, signerPayload.toPayload());

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
