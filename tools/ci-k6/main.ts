import {
  devAccounts,
  ensureProviderStake,
  ExtrinsicHelper,
  initialize,
  IntentBuilder,
  provisionProvider,
  SchemaBuilder,
} from '@projectlibertylabs/frequency-scenario-template';

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

export async function createAndStake(providerUrl) {
  await initialize(providerUrl);
  console.log('Connected...');

  const account = devAccounts[0].keys;
  const provider = await provisionProvider('//Alice', 'Alice Provider');
  await ensureProviderStake(account, 10_000_000_000_000, provider.msaId.toBigInt());

  // Need to create an 'OnChain' schema in order to test endpoints, as there are no registered 'OnChain' DSNP schemas
  let onChainSchemaId: number;

  // 1. Resolve or create an OnChain Intent
  const intent = await new IntentBuilder()
    .withAutoDetectExisting(true)
    .withName('test.graphchange')
    .withPayloadLocation('OnChain')
    .build(account);

  if (intent.schemas?.length > 0) {
    onChainSchemaId = intent.schemas[intent.schemas.length - 1];
    console.log(
      'Resolved OnChain schema:',
      onChainSchemaId,
      'from existing Intent:',
      intent.id,
      'with name:',
      intent.name,
    );
  } else {
    const schema = await new SchemaBuilder()
      .withIntentId(intent.id)
      .withModelType('AvroBinary')
      .withModel(AVRO_GRAPH_CHANGE)
      .build(account);
    if (schema) {
      console.log('Created OnChain schema:', schema.id);
      onChainSchemaId = schema.id;
    }
  }

  if (!onChainSchemaId) {
    throw new Error('Failed to create OnChain schema');
  }
}

let returnCode = 0;
createAndStake('ws://localhost:9944')
  .catch((error) => {
    console.error('Error:', error);
    returnCode = 1;
  })
  .finally(async () => {
    await ExtrinsicHelper.disconnect();
    process.exit(returnCode);
  });
