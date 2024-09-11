import { ExtrinsicHelper, initialize } from '@projectlibertylabs/frequency-scenario-template';
import log from 'loglevel';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { SignerResult, Signer } from '@polkadot/types/types';

const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://127.0.0.1:9944';

async function main() {
  await cryptoWaitReady();
  log.setLevel('trace');
  console.log('Connecting...');
  await initialize(FREQUENCY_URL);
  log.setLevel('trace');

  // eslint-disable-next-line no-use-before-define
  await retireMsa();
}

async function retireMsa() {
  await cryptoWaitReady();
  const aliceKeys = new Keyring({ type: 'sr25519' }).createFromUri('//Alice');
  // 7. Attempt to retire an MSA for BOB, who is not a provider and only has an msa and nothing else
  //    Result:  SUCCESS!!!
  const bobKeys = new Keyring({ type: 'sr25519' }).createFromUri('//Bob');

  // @ts-ignore
  // eslint-disable-next-line consistent-return
  const getRawPayloadForSigning = async (tx: any, signerAddress: string): Promise<SignerPayloadRaw> => {
    let signRaw;
    try {
      await tx.signAsync(signerAddress, {
        signer: {
          signRaw: (raw) => {
            console.log('signRaw called with:', raw);
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
    signRaw: (raw) => {
      console.log('signRaw function called with:', raw);
      return Promise.resolve(result);
    },
  });

  const tx = ExtrinsicHelper.apiPromise.tx.msa.retireMsa();

  const payload = await getRawPayloadForSigning(tx, bobKeys.address);
  console.log('payload:', payload);

  const { data } = payload;
  // Confirmed: Prefix is not needed for signing, the payload and signature can be verified with polkadot-js
  const prefixedData = data;
  console.log('prefixedData:', prefixedData);

  // 3. From github, use the withType option to sign the payload to get the id = 01 for the enum error
  const signature = bobKeys.sign(prefixedData, { withType: true });
  // Confirmed: this signature is correct and can be verified with polkadot-js, if you remove the prefix 0x01
  console.log('signature:', u8aToHex(signature));

  const prefixedSignature: SignerResult = { id: 1, signature: u8aToHex(signature) };
  console.log('prefixedSignature:', prefixedSignature);

  const signer = getSignerForRawSignature(prefixedSignature);
  console.log('signer:', signer);

  const { nonce } = await ExtrinsicHelper.apiPromise.query.system.account(bobKeys.address);
  console.log('nonce:', nonce.toHuman());

  // Adding signer after confirming that the payload and signature are correct
  // Error: createType(ExtrinsicSignature):: Unable to create Enum via index 92, in Ed25519, Sr25519, Ecdsa
  // TODO: Something is wrong with signer, at least it's not doing what we want it to, which is close the circle
  // UPDATE: This error is solved by using the withType option in the sign function
  //   However, now the error is Invalid Transaction: Custom error: 2
  const submittableExtrinsic = await tx.signAsync(bobKeys.address, { nonce, signer });
  // Here we can examine the signature, which should match the above signature
  // However, it a signature that can be verified with polkadot-js and it does not have the prefix 0x01
  console.log('submittableExtrinsic.signature:', submittableExtrinsic.signature.toHex());
  // 4. Attempt to add the signature to the transaction
  //    Result: the signature does not change
  // 5. Attempt to add the prefix to the signature
  //    Result: Transaction has a bad signature
  //            It seems like the signature might be correct as-is, but there is another problem with the transaction
  // const signatureWithPrefix = new Uint8Array([0x01, ...Array.from(signature)]);
  // console.log('signatureWithPrefix:', u8aToHex(signatureWithPrefix));

  // 6. Remove Attempt to add the signature to the transaction
  //    Result: Back to Invalid Transaction: Custom error: 2
  //    Visual examination of the signature shows that it matches the signature from the signAsync call, but it is not prefixed
  // submittableExtrinsic.addSignature(aliceKeys.addressRaw, u8aToHex(signature), '0x00');
  // console.log('after addSignature: submittableExtrinsic.signature:', submittableExtrinsic.signature.toHex());

  // 1. Attempt to remove the signer from the signAsync call
  // const signerPayload = await tx.signAsync(aliceKeys, { nonce, signer: null, era: 0 });
  // console.log('signerPayload:', signerPayload.data);
  console.log('Signer Address:', bobKeys.address);

  // const transaction = ExtrinsicHelper.apiPromise.tx(tx);
  // console.log('transaction:', transaction);

  // console.log('Sending transaction with signature:', u8aToHex(signature));

  // 2. Attempt to add the signature to the transaction
  // transaction.addSignature(aliceKeys.addressRaw, u8aToHex(signature), signerPayload.toHex());

  await new Promise<void>((resolve, reject) => {
    submittableExtrinsic.send(({ status, dispatchError }) => {
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
