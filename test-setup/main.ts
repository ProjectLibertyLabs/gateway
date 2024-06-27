import { cryptoWaitReady } from '@polkadot/util-crypto';
import { initialize, provisionProvider, initializeLocalUsers, ExtrinsicHelper } from '@amplica-labs/frequency-scenario-template';

const BASE_SEED_PHRASE = process.env.PROVIDER_SEED_PHRASE || '//Alice';
const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://0.0.0.0:9944';

async function setup() {
  await cryptoWaitReady();
  await initialize(FREQUENCY_URL);

  // Get keys and MSA IDs for users provisioned in setup
  await provisionProvider(BASE_SEED_PHRASE, 'Alice');
  await initializeLocalUsers(`${BASE_SEED_PHRASE}//users`, 4);

  await ExtrinsicHelper.disconnect();
}

setup().catch((err) => console.log(err));
