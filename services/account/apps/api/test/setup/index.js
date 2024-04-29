import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { waitReady } from '@polkadot/wasm-crypto';
import { _0n, u8aToHex, u8aWrapBytes } from '@polkadot/util';
import { userPrivateConnections, userPrivateFollows, publicKey, userPublicFollows } from '@dsnp/frequency-schemas/dsnp';
import { Bytes } from '@polkadot/types';

const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://127.0.0.1:9944';

function signPayloadWithKeyring(signingAccount, payload) {
  return { Sr25519: u8aToHex(signingAccount.sign(u8aWrapBytes(payload.toU8a()))) };
}

const sendStatusCb =
  (resolve) =>
  ({ status, events }) => {
    if (status.isInBlock || status.isFinalized) {
      const msaCreated = events.map(({ event }) => event).find((event) => event.method === 'MsaCreated');
      const schemaCreated = events.map(({ event }) => event).find((event) => event.method === 'SchemaCreated');
      const itemizedPageUpdated = events
        .map(({ event }) => event)
        .find((event) => event.method === 'ItemizedPageUpdated');
      if (msaCreated) {
        resolve(msaCreated.data.msaId);
      } else {
        resolve();
      }
      if (schemaCreated) {
        console.log(`Schema Created: ${schemaCreated.data}`);
        resolve(schemaCreated.data.schemaId);
      } else {
        resolve();
      }
      if (itemizedPageUpdated) {
        console.log(`Itemized Page Updated: ${itemizedPageUpdated.data}`);
        resolve(itemizedPageUpdated.data);
      } else {
        resolve();
      }
    }
  };

const createViaDelegation = (api, provider) => async (keyUri, baseNonce) => {
  // Create delegate
  const keyring = new Keyring({ type: 'sr25519' });
  const delegator = keyring.addFromUri(keyUri);
  const rawPayload = { authorizedMsaId: 1, expiration: 100, schemaIds: [1, 2, 3, 4] };
  const addProviderPayload = api.registry.createType('PalletMsaAddProvider', rawPayload);
  const proof = signPayloadWithKeyring(delegator, addProviderPayload);

  const tx = api.tx.msa.createSponsoredAccountWithDelegation(delegator.address, proof, addProviderPayload.toU8a());
  await new Promise((resolve) => tx.signAndSend(provider, { nonce: baseNonce }, sendStatusCb(resolve)));

  const msaId = await api.query.msa.publicKeyToMsaId(delegator.address);

  if (msaId.isNone) throw new Error('Failed to create MSA');
  const msaIdStr = msaId.value.toString();

  console.log(`${keyUri} should have MSA Id ${msaIdStr}`);
};

async function main() {
  await waitReady();
  const provider = new WsProvider(FREQUENCY_URL, 500, {}, 3_000);
  // Connect to the API
  const api = await ApiPromise.create({
    provider,
    // throwOnConnect: true,
  });
  await Promise.race([
    api.isReady,
    new Promise((_, reject) => setTimeout(() => reject(new Error('WS Connection Timeout')), 30_000)),
  ]);

  console.log('API Connected');
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  // Create Alice MSA
  await new Promise((resolve) => api.tx.msa.create().signAndSend(alice, sendStatusCb(resolve)));
  console.log('Alice should have MSA Id 1');
  // Create Alice Provider
  await new Promise((resolve) => api.tx.msa.createProvider('Alice').signAndSend(alice, sendStatusCb(resolve)));
  console.log('Alice (MSA Id 1) should be a provider now');

  let currentNonce = (await api.rpc.system.accountNextIndex(alice.address)).toBn().toNumber();
  console.log(`Current nonce: ${currentNonce}`);
  // Create Schemas
  const txSchema1 = api.tx.schemas.createSchema(JSON.stringify(userPublicFollows), 'AvroBinary', 'Paginated');
  await new Promise((resolve) => txSchema1.signAndSend(alice, { nonce: currentNonce }, sendStatusCb(resolve)));
  currentNonce++;
  console.log('Public Follow Schema created');
  const txSchema2 = api.tx.schemas.createSchema(JSON.stringify(userPrivateFollows), 'AvroBinary', 'Paginated');
  await new Promise((resolve) => txSchema2.signAndSend(alice, { nonce: currentNonce }, sendStatusCb(resolve)));
  currentNonce++;
  console.log('Private Follow Schema created');
  const txSchema3 = api.tx.schemas.createSchema(JSON.stringify(userPrivateConnections), 'AvroBinary', 'Paginated');
  await new Promise((resolve) => txSchema3.signAndSend(alice, { nonce: currentNonce }, sendStatusCb(resolve)));
  currentNonce++;
  console.log('Private Friend Schema created');
  const txSchema4 = api.tx.schemas.createSchemaViaGovernance(
    alice.publicKey,
    JSON.stringify(publicKey),
    'AvroBinary',
    'Itemized',
    ['AppendOnly'],
  );
  const sudoTx = api.tx.sudo.sudo(txSchema4);
  await new Promise((resolve) => sudoTx.signAndSend(alice, { nonce: currentNonce }, sendStatusCb(resolve)));
  currentNonce++;
  console.log('Public Key Schema created');

  /// Claim handle for Alice
  const currentBlock = (await api.rpc.chain.getBlock()).block.header.number.toNumber();
  const handle_bytes = new Bytes(api.registry, 'AliceHandle');
  const payload_ext = {
    baseHandle: handle_bytes,
    expiration: currentBlock + 50,
  };
  const claimHandlePayload = api.registry.createType('CommonPrimitivesHandlesClaimHandlePayload', payload_ext);
  const claimHandleProof = {
    Sr25519: u8aToHex(alice.sign(u8aWrapBytes(claimHandlePayload.toU8a()))),
  };
  const claimHandle = api.tx.handles.claimHandle(alice.publicKey, claimHandleProof, claimHandlePayload);
  await claimHandle.signAndSend(alice, { nonce: currentNonce });
  console.log('Alices Handle Claimed!');
  currentNonce++;

  // Delegations
  const delegators = ['//Bob', '//Charlie', '//Dave', '//Eve'];
  const create = createViaDelegation(api, alice);
  await Promise.all(delegators.map((delegator, i) => create(delegator, currentNonce++)));

  const capacityResult = await api.query.capacity.capacityLedger(1);
  const capacity = capacityResult.unwrapOr({ totalCapacityIssued: 0n });
  const stakeAmount =
    2000000000000000n -
    (typeof capacity.totalCapacityIssued === 'bigint'
      ? capacity.totalCapacityIssued
      : capacity.totalCapacityIssued.toBigInt());
  await api.tx.capacity.stake(1, stakeAmount).signAndSend(alice, { nonce: currentNonce });

  console.log('Create Provider 1 as Alice and Delegator 2, 3, 4, 5');
  console.log('Public keys added to delegators');
  console.log(`Staked capacity to provider: ${stakeAmount}`);
  console.log('Setup complete');
}

function getTestConfig(keySchemaId) {
  const config = {};
  config.sdkMaxStaleFriendshipDays = 100;
  config.maxPageId = 100;
  config.dsnpVersions = [DsnpVersion.Version1_0];
  config.maxKeyPageSizeBytes = 100;
  const schemaMap = {};
  schemaMap[1] = {
    dsnpVersion: DsnpVersion.Version1_0,
    connectionType: ConnectionType.Follow,
    privacyType: PrivacyType.Public,
  };
  schemaMap[2] = {
    dsnpVersion: DsnpVersion.Version1_0,
    connectionType: ConnectionType.Follow,
    privacyType: PrivacyType.Private,
  };
  schemaMap[3] = {
    dsnpVersion: DsnpVersion.Version1_0,
    connectionType: ConnectionType.Friendship,
    privacyType: PrivacyType.Private,
  };
  config.schemaMap = schemaMap;
  return config;
}

main()
  .catch((r) => {
    console.error(r);
    process.exit(1);
  })
  .finally(process.exit);
