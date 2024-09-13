/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-extraneous-dependencies */
import {
  initialize,
  getCurrentBlockNumber,
  provisionProvider,
  initializeLocalUsers,
  ExtrinsicHelper,
  generateAddKeyPayload,
  ChainUser,
  signPayloadSr25519,
} from '@projectlibertylabs/frequency-scenario-template';
import { KeyInfoResponse, MessageSourceId } from '@frequency-chain/api-augment/interfaces';
import { KeyringPair } from '@polkadot/keyring/types';
import { AccountId } from '@polkadot/types/interfaces';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import log from 'loglevel';
import { SignerResult, Signer, SignerPayloadRaw, ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';

export const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://0.0.0.0:9944';
export const BASE_SEED_PHRASE = process.env.SEED_PHRASE || '//Alice';

export async function setupProviderAndUsers() {
  await cryptoWaitReady();
  await initialize(FREQUENCY_URL);
  log.setLevel('trace');

  const currentBlockNumber = await getCurrentBlockNumber();

  // Get keys and MSA Ids for users provisioned in setup
  const provider = await provisionProvider(BASE_SEED_PHRASE, 'Alice');
  const users = await initializeLocalUsers(`${BASE_SEED_PHRASE}//users`, 4);

  const maxMsaId = (await ExtrinsicHelper.apiPromise.query.msa.currentMsaIdentifierMaximum()).toString();

  return { provider, users, currentBlockNumber, maxMsaId };
}

/**
 * Generate an array of extrinsics to remove all but the "primary" control key
 * from an MSA.
 */
export async function removeExtraKeysFromMsa({
  msaId,
  keypair,
}: {
  msaId?: MessageSourceId | undefined;
  keypair: KeyringPair;
}): Promise<void> {
  if (!msaId) {
    return;
  }

  const keys = await ExtrinsicHelper.apiPromise.rpc.msa.getKeysByMsaId(msaId);
  if (keys.isNone) {
    return;
  }

  const { msa_keys: msaKeys }: KeyInfoResponse = keys.unwrap();
  for (const key of msaKeys.toArray().filter((k: AccountId) => !k.eq(keypair.addressRaw))) {
    const publicKey = decodeAddress(key);
    await ExtrinsicHelper.deletePublicKey(keypair, publicKey).signAndSend();
  }
}

export async function generateSignedAddKeyPayload(user: ChainUser, newKeys: KeyringPair, currentBlockNumber?: number) {
  const payload = await generateAddKeyPayload(
    { msaId: user.msaId!, newPublicKey: newKeys.publicKey },
    undefined,
    currentBlockNumber,
  );
  const addKeyData = ExtrinsicHelper.api.registry.createType('PalletMsaAddKeyData', payload);
  const ownerProof = signPayloadSr25519(user.keypair, addKeyData);
  const newKeyProof = signPayloadSr25519(newKeys, addKeyData);

  return { payload, ownerProof, newKeyProof };
}

export async function generateAddPublicKeyExtrinsic(
  user: ChainUser,
  newKeys: KeyringPair,
  currentBlockNumber?: number,
) {
  const { payload, ownerProof, newKeyProof } = await generateSignedAddKeyPayload(user, newKeys, currentBlockNumber);
  return () =>
    ExtrinsicHelper.apiPromise.tx.msa.addPublicKeyToMsa(user.keypair.publicKey, ownerProof, newKeyProof, payload);
}

/**
 * Retrieves the raw payload for signing a transaction.
 * Use signAsync to properly encode the payload for signing.
 * In this case we want the encoded payload for retireMsa, which does not take any arguments.
 *
 * @param tx - The transaction object.
 * @param signerAddress - The address of the signer.
 * @returns A promise that resolves to the raw payload for signing.
 */
export const getRawPayloadForSigning = async (
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
