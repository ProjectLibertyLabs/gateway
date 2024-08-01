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
} from '@amplica-labs/frequency-scenario-template';
import { KeyInfoResponse, MessageSourceId } from '@frequency-chain/api-augment/interfaces';
import { KeyringPair } from '@polkadot/keyring/types';
import { AccountId } from '@polkadot/types/interfaces';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import log from 'loglevel';

export const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://0.0.0.0:9944';
export const BASE_SEED_PHRASE = process.env.SEED_PHRASE || '//Alice';

export async function setupProviderAndUsers() {
  await cryptoWaitReady();
  await initialize(FREQUENCY_URL);
  log.setLevel('trace');

  const currentBlockNumber = await getCurrentBlockNumber();

  // Get keys and MSA IDs for users provisioned in setup
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
