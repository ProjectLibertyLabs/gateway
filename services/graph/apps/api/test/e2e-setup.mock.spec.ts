/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { initialize, getCurrentBlockNumber, provisionProvider, initializeLocalUsers, ExtrinsicHelper } from '@amplica-labs/frequency-scenario-template';
import { cryptoWaitReady } from '@polkadot/util-crypto';
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
