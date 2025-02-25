import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';

const keyring = new Keyring({ type: 'sr25519' });

const AVRO_GRAPH_CHANGE = {
  type: 'record',
  name: 'GraphChange',
  fields: [
    // When converting from Frequency Schema Message to DSNP Announcement, assume announcementType=1
    {
      name: 'changeType',
      type: {
        name: 'ChangeTypeEnum',
        type: 'enum',
        symbols: ['Unfollow', 'Follow'], // Encoded as int
      },
    },
    {
      name: 'fromId',
      type: {
        name: 'DSNPId',
        type: 'fixed',
        size: 8,
      },
    },
    {
      name: 'objectId',
      type: 'DSNPId',
    },
  ],
};

export async function createAndStake(providerUrl, keyUri) {
  const api = await ApiPromise.create({ provider: new WsProvider(providerUrl) });

  console.log('Connected...');

  const account = keyring.createFromUri(keyUri);

  const call = api.tx.utility.batchAll([
    api.tx.msa.create(),
    api.tx.msa.createProvider('alice'),
    api.tx.capacity.stake(1, 10_000_000_000_000),
    // Need to create an 'OnChain' schema in order to test endpoints, as there are no registered 'OnChain' DSNP schemas
    // **SHOULD** get created as SchemaID 16001
    api.tx.schemas.createSchema(JSON.stringify(AVRO_GRAPH_CHANGE), 'AvroBinary', 'OnChain'),
  ]);

  console.log('Submitting call...');
  await new Promise(async (resolve, reject) => {
    const unsub = await call.signAndSend(account, ({ status, events }) => {
      if (status.isInBlock || status.isFinalized) {
        console.log(
          `Block hash: ${(status.isInBlock && status.asInBlock) || (status.isFinalized && status.asFinalized)}`,
        );
        if (events)
          console.log(
            'All Events',
            events.map((x) => x.toHuman()),
          );
        const success = events.find((x) => api.events.system.ExtrinsicSuccess.is(x.event));
        const failure = events.find((x) => api.events.system.ExtrinsicFailed.is(x.event));
        const { event: schemaCreated } = events.find((x) => api.events.schemas.SchemaCreated.is(x.event));
        unsub();
        if (schemaCreated) {
          console.log(`Created OnChain schema ID ${schemaCreated.data.schemaId.toNumber()}`);
        }
        if (success && !failure) {
          console.log('Success!');
          resolve();
        } else {
          console.error('FAILED!');
          reject();
        }
      }
    });
  });
}

try {
  await createAndStake('ws://localhost:9944', '//Alice');
  process.exit(0);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
