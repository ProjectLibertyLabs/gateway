/* eslint-disable @typescript-eslint/no-non-null-assertion */
import log from 'loglevel';
import {
  initialize,
  provisionProvider,
  ensureProviderStake,
  ChainUser,
  initializeLocalUsers,
  SchemaBuilder,
  provisionLocalUserCreationExtrinsics,
  provisionUserGraphResets,
  provisionUserGraphEncryptionKeys,
  ChainEventHandler,
  ExtrinsicHelper,
  provisionUsersOnChain,
} from '@amplica-labs/frequency-scenario-template';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { EnvironmentType, Graph, ImportBundleBuilder } from '@dsnp/graph-sdk';

const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://127.0.0.1:9944';

const CAPACITY_AMOUNT_TO_STAKE = 2000000000000000n;

const BASE_SEED_PHRASE = process.env.SEED_PHRASE || '//Alice';

async function main() {
  await cryptoWaitReady();
  console.log('Connecting...');
  await initialize(FREQUENCY_URL);
  log.setLevel('trace');

  // Create provider
  console.log('Creating/resolving provider...');
  const provider = await provisionProvider(`${BASE_SEED_PHRASE}`, 'Alice');
  console.log(`Provider ID is: ${provider.msaId!.toString()}`);

  // Ensure provider is staked
  await ensureProviderStake(provider.keypair, CAPACITY_AMOUNT_TO_STAKE, provider.msaId!);

  // Delegations
  const delegators: ChainUser[] = await initializeLocalUsers(`${BASE_SEED_PHRASE}//users`, 256);

  const builder = new SchemaBuilder().withAutoDetectExistingSchema();
  const updateSchema = await builder.withName('dsnp', 'update').resolve();
  const publicKeySchema = await builder.withName('dsnp', 'public-key-key-agreement').resolve();
  const publicFollowsSchema = await builder.withName('dsnp', 'public-follows').resolve();
  const privateFollowsSchema = await builder.withName('dsnp', 'private-follows').resolve();
  const privateConnectionsSchema = await builder.withName('dsnp', 'private-connections').resolve();

  const schemaIds = [
    updateSchema!.id.toNumber(),
    publicKeySchema!.id.toNumber(),
    publicFollowsSchema!.id.toNumber(),
    privateFollowsSchema!.id.toNumber(),
    privateConnectionsSchema!.id.toNumber(),
  ];

  // Create followers
  await provisionLocalUserCreationExtrinsics(provider, [...delegators.values()], { schemaIds, allocateHandle: false });
  await provisionUserGraphResets([...delegators.values()]);
  await provisionUserGraphEncryptionKeys([...delegators.values()], true);
  const eventHandler: ChainEventHandler = (events) => {
    events.forEach((eventRecord) => {
      const { event } = eventRecord;
      if (event && ExtrinsicHelper.apiPromise.events.msa.MsaCreated.is(event)) {
        const { msaId, key } = event.data;
        const address = key.toString();
        const delegator = delegators.find((d) => d.keypair.address === address);
        if (delegator) {
          delegator.msaId = msaId;
        } else {
          console.error('Cannot find delegator ', address);
        }
      }
    });
  };

  await provisionUsersOnChain(provider.keypair, [...delegators.values()], [eventHandler]);

  console.log(`Created Provider ${provider.msaId?.toString()} as Alice`);
  console.log(
    'Created delegated MSAs: ',
    delegators.map((d) => d.msaId!.toString()),
  );

  const graph: Graph = new Graph({ environmentType: EnvironmentType.Mainnet });
  graph.applyActions([{ type: 'Connect', ownerDsnpUserId: delegators[0].msaId!.toString(), connection: { dsnpUserId: delegators[1].msaId!.toString(), schemaId: publicFollowsSchema!.id.toNumber() }}]);
  const exportBundles = graph.exportUpdates();
  console.log('Setup complete');
}

main()
  .catch((r) => {
    console.error(r);
    process.exit(1);
  })
  .finally(process.exit);
