import '@frequency-chain/api-augment';
import {
  ChainEventHandler,
  ChainUser,
  ExtrinsicHelper,
  SchemaBuilder,
  ensureProviderStake,
  initialize,
  initializeLocalUsers,
  provisionLocalUserCreationExtrinsics,
  provisionProvider,
  provisionUserGraphEncryptionKeys,
  provisionUserGraphResets,
  provisionUsersOnChain,
  IntentBuilder,
} from '@projectlibertylabs/frequency-scenario-template';
import log from 'loglevel';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const FREQUENCY_API_WS_URL = process.env.FREQUENCY_API_WS_URL || 'ws://127.0.0.1:9944';

const CAPACITY_AMOUNT_TO_STAKE = 2000000000000000n;

const BASE_SEED_PHRASE = process.env.PROVIDER_ACCOUNT_SEED_PHRASE || '//Alice';

async function main() {
  await cryptoWaitReady();
  console.log('Connecting...');
  await initialize(FREQUENCY_API_WS_URL);
  log.setLevel('trace');

  // Create provider
  console.log('Creating/resolving provider...');
  const provider = await provisionProvider(`${BASE_SEED_PHRASE}`, 'Alice');
  console.log(`Provider ID is: ${provider.msaId!.toString()}`);

  // Ensure provider is staked
  await ensureProviderStake(provider.keypair, CAPACITY_AMOUNT_TO_STAKE, provider.msaId!);

  // Delegations
  const delegators: ChainUser[] = await initializeLocalUsers(`${BASE_SEED_PHRASE}//users`, 256);
  const revokedUser: ChainUser = (await initializeLocalUsers(`${BASE_SEED_PHRASE}//revoked`, 1))[0];
  const undelegatedUser: ChainUser = (await initializeLocalUsers(`${BASE_SEED_PHRASE}//undelegated`, 1))[0];

  const builder = new IntentBuilder().withAutoDetectExisting(true);
  const updateSchema = await builder.withName('dsnp', 'update').resolve();
  const publicKeySchema = await builder.withName('dsnp', 'public-key-key-agreement').resolve();
  const publicFollowsSchema = await builder.withName('dsnp', 'public-follows').resolve();
  const privateFollowsSchema = await builder.withName('dsnp', 'private-follows').resolve();
  const privateConnectionsSchema = await builder.withName('dsnp', 'private-connections').resolve();

  const intentIds = [
    updateSchema!.id,
    publicKeySchema!.id,
    publicFollowsSchema!.id,
    privateFollowsSchema!.id,
    privateConnectionsSchema!.id,
  ];

  // Create users
  await provisionLocalUserCreationExtrinsics(provider, [...delegators, revokedUser], {
    intentIds,
    allocateHandle: false,
  });
  await provisionUserGraphResets([...delegators, revokedUser]);
  await provisionUserGraphEncryptionKeys([...delegators, revokedUser], true);

  const eventHandler: (userMap: ChainUser[]) => ChainEventHandler = (userMap: ChainUser[]) => (events) => {
    events.forEach((eventRecord) => {
      const { event } = eventRecord;
      if (event && ExtrinsicHelper.apiPromise.events.msa.MsaCreated.is(event)) {
        const { msaId, key } = event.data;
        const address = key.toString();
        const user = userMap.find((d) => d.keypair.address === address);
        if (user) {
          user.msaId = msaId;
        } else {
          console.error('Cannot find mapped user ', address);
        }
      }
    });
  };

  await provisionUsersOnChain(
    provider.keypair,
    [...delegators, revokedUser],
    [eventHandler([...delegators, revokedUser])],
  );

  const delegation = await ExtrinsicHelper.apiPromise.query.msa.delegatorAndProviderToDelegation(
    revokedUser.msaId,
    provider.msaId,
  );
  if (delegation.isSome && delegation.unwrap().revokedAt.toNumber() === 0) {
    console.log('Revoking delegation to set up a user with a revoked delegation...');
    await ExtrinsicHelper.revokeDelegationByDelegator(revokedUser.keypair, provider.msaId).signAndSend();
  }

  // Make sure un-delegated user exists on-chain. Requires tokens.
  if (!undelegatedUser?.msaId) {
    console.log('Creating un-delegated user on-chain...');
    // .fundAndSend() doesn't take into account an address that has NO balance at all (not even existential deposit).
    // To work around this, we'll fund 2x the cost just to make sure
    const extrinsic = ExtrinsicHelper.createMsa(undelegatedUser.keypair);
    await extrinsic.fundOperation(provider.keypair);
    const [targetEvent] = await ExtrinsicHelper.createMsa(undelegatedUser.keypair).fundAndSend(provider.keypair);
    if (targetEvent && ExtrinsicHelper.apiPromise.events.msa.MsaCreated.is(targetEvent)) {
      undelegatedUser.msaId = targetEvent.data.msaId;
    }
  }

  console.log(`Created Provider ${provider.msaId?.toString()} as Alice with key ${provider.keypair.address}`);
  console.log(
    'Created delegated MSAs: ',
    delegators.map((d) => d.msaId!.toString()),
  );
  console.log('Created MSA with revoked delegation: ', revokedUser.msaId.toString());
  console.log(`Created un-delegated MSA: ${undelegatedUser.msaId.toString()}`);
  console.log('Setup complete');
}

main()
  .catch((r) => {
    console.error(r);
    process.exit(1);
  })
  .finally(process.exit);
