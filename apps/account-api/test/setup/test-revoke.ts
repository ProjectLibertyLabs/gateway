import { ExtrinsicHelper, initialize } from '@projectlibertylabs/frequency-scenario-template';
import log from 'loglevel';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { SignerResult, Signer, SignerPayloadRaw, ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';

const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://127.0.0.1:9944';

async function main() {
  await cryptoWaitReady();
  log.setLevel('trace');
  console.log('Connecting...');
  await initialize(FREQUENCY_URL);

  // eslint-disable-next-line no-use-before-define
  await revokeDelegation();
}

async function revokeDelegation() {
  await cryptoWaitReady();
  const bobKeys = new Keyring({ type: 'sr25519' }).createFromUri('//Bob');

  /**
   * Retrieves the raw payload for signing a transaction.
   * Use signAsync to properly encode the payload for signing.
   * In this case we want the encoded payload for retireMsa, which does not take any arguments.
   *
   * @param tx - The transaction object.
   * @param signerAddress - The address of the signer.
   * @returns A promise that resolves to the raw payload for signing.
   */
  const getRawPayloadForSigning = async (
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
    signerAddress: string,
  ): Promise<SignerPayloadRaw> => {
    const fakeError = '*** Interrupt signing for payload collection ***';
    let signRaw: SignerPayloadRaw;
    try {
      await tx.signAsync(signerAddress, {
        signer: {
          signRaw: (raw) => {
            console.log('signRaw called with [raw]:', raw);
            signRaw = raw;
            // Interrupt the signing process to get the raw payload, as encoded by polkadot-js
            throw new Error(fakeError);
          },
        },
      });
    } catch (e: any) {
      // If we encountered an actual error, re-throw it; otherwise
      // ignore the fake error we threw above
      if (e?.message !== fakeError) {
        throw e;
      }
    }
    return signRaw;
  };

  /**
   * Returns a signer function for a given SignerResult.
   * Signer will be used to pass our verified signature to the transaction without any mutation.
   *
   * @param result - The SignerResult object.
   * @returns A Signer function that will pass the signature to the transaction without mutation.
   */
  const getSignerForRawSignature = (result: SignerResult): Signer => ({
    signRaw: (raw) => {
      console.log('signRaw function called with [raw]:', raw);
      return Promise.resolve(result);
    },
  });

  // Get the transaction for retireMsa, will be used to get the raw payload for signing
  const providerId: number = 1;
  const tx = ExtrinsicHelper.apiPromise.tx.msa.revokeDelegationByDelegator(providerId);

  const signerPayload: SignerPayloadRaw = await getRawPayloadForSigning(tx, bobKeys.address);
  // payload contains the signer address, the encoded data/payload for retireMsa, and the type of the payload
  console.log('payload: SignerPayloadRaw: ', signerPayload);

  const { data } = signerPayload;

  // From github:https://github.com/polkadot-js/tools/issues/175
  // Use the withType option to sign the payload to get the prefix 0x01
  // which specifies the SR25519 type of the signature and avoids getting and error about an enum in the next signAsync step
  const signature: Uint8Array = bobKeys.sign(data, { withType: true });
  // Confirmed: this signature is correct and can be verified with polkadot-js, if you remove the prefix 0x01
  console.log('signature:', u8aToHex(signature));

  // Construct the SignerResult object
  // SignerResult is used to get the Signer.signRaw function that will be used to pass the signature to the transaction
  const prefixedSignature: SignerResult = { id: 1, signature: u8aToHex(signature) };
  console.log('prefixedSignature:', prefixedSignature);

  const signer: Signer = getSignerForRawSignature(prefixedSignature);
  console.log('signer:', signer);

  const { nonce } = await ExtrinsicHelper.apiPromise.query.system.account(bobKeys.address);
  console.log('nonce:', nonce.toHuman());

  // Here submittableExtrinsic is the retireMsa transaction
  // signer uses signRaw to pass the original signature to the transaction
  // This makes sure that the signature is not mutated in any way
  // Avoiding tx.addSignature() because it seems to be mutating the signature and causing the transaction to fail
  // tx.addSignature(bobKeys.address, prefixedSignature.signature, signer);

  // 1. Attempt to sign the transaction with the signature using addSignature()
  //    Result: 1010: Invalid Transaction: Transaction has a bad signature
  //    Reason: I think the payload does not match because ExtrinsicPayload is complex and not filled in correctly
  //
  // 2. Attempt to use api.createType() to build the ExtrinsicPayload
  //    Result: Too complicated to build the entire extrinsic manually.

  // const extrinsicPayload: ExtrinsicPayloadValue = {
  //   method: tx.toHex(),
  //   nonce,
  //   specVersion:
  //   genesisHash: tx.genesisHash,
  //   blockHash: tx.blockHash,
  // };
  const dataUint8Array = hexToU8a(data);
  console.log('dataUint8Array.length:', dataUint8Array.length);
  tx.addSignature(bobKeys.address, signature, tx.toU8a());

  const submittableExtrinsic = await tx.signAsync(bobKeys.address, { nonce, signer });
  console.log('tx.signature:', tx.signature.toHex());

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
