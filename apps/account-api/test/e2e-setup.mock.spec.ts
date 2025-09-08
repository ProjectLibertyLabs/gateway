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
import { u8aToHex } from '@polkadot/util';

export const FREQUENCY_API_WS_URL = process.env.FREQUENCY_API_WS_URL || 'ws://0.0.0.0:9944';
export const BASE_SEED_PHRASE = process.env.SEED_PHRASE || '//Alice';

export async function setupProviderAndUsers(numUsers = 4) {
  await cryptoWaitReady();
  await initialize(FREQUENCY_API_WS_URL);
  log.setLevel('trace');

  const currentBlockNumber = await getCurrentBlockNumber();

  // Get keys and MSA Ids for users provisioned in setup
  const provider = await provisionProvider(BASE_SEED_PHRASE, 'Alice');
  const users = await initializeLocalUsers(`${BASE_SEED_PHRASE}//users`, numUsers);
  const revokedUser: ChainUser = (await initializeLocalUsers(`${BASE_SEED_PHRASE}//revoked`, 1))[0];
  const undelegatedUser: ChainUser = (await initializeLocalUsers(`${BASE_SEED_PHRASE}//undelegated`, 1))[0];

  const maxMsaId = (await ExtrinsicHelper.apiPromise.query.msa.currentMsaIdentifierMaximum()).toString();

  return { provider, users, revokedUser, undelegatedUser, currentBlockNumber, maxMsaId };
}

/**
 * Generate an array of extrinsics to remove all but the "primary" control key
 * from an MSA.
 */
export async function removeExtraKeysFromMsa({
  msaId,
  keypair,
}: {
  msaId?: MessageSourceId | string | undefined;
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
  payload.newPublicKey = u8aToHex(payload.newPublicKey);

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
