import fs from 'fs/promises';
import { Bytes } from '@polkadot/types';
import { getApi, createKey, signPayloadSr25519 } from './helpers/chain.mjs';

const GENERATE_COUNT = 10;

const signup = (api) => {
  const keypair = createKey();
  const expiration = 100; // Will this fail when running against longer chains?

  const addProviderData = api.registry.createType('PalletMsaAddProvider', {
    authorizedMsaId: 1,
    schemaIds: [1],
    expiration,
  });
  const createTx = api.tx.msa.createSponsoredAccountWithDelegation(
    keypair.address,
    signPayloadSr25519(keypair, addProviderData),
    addProviderData,
  );
  const claimHandlePayload = api.registry.createType('CommonPrimitivesHandlesClaimHandlePayload', {
    baseHandle: new Bytes(api.registry, keypair.address.substring(0, 8)),
    expiration,
  });
  const claimTx = api.tx.handles.claimHandle(
    keypair.address,
    signPayloadSr25519(keypair, claimHandlePayload),
    claimHandlePayload,
  );

  const addRecoveryCommitmentPayload = api.registtry.createType(
    'CommonPrimitivesMsaRecoveryCommitmentPayload',
    recoveryCommitment,
    expiration,
  );
  const addRecoveryCommitmentTx = api.tx.msa.addRecoveryCommitment(
    keypair.address,
    signPayloadSr25519(keypair, addRecoveryCommitmentPayload),
    addRecoveryCommitmentPayload,
  );

  return {
    signUp: {
      extrinsics: [
        {
          pallet: 'msa',
          extrinsicName: 'createSponsoredAccountWithDelegation',
          encodedExtrinsic: createTx.toHex(),
        },
        {
          pallet: 'handles',
          extrinsicName: 'claimHandle',
          encodedExtrinsic: claimTx.toHex(),
        },
        {
          pallet: 'msa',
          extrinsicName: 'addRecoveryCommitment',
          encodedExtrinsic: addRecoveryCommitmentTx.toHex(),
        },
      ],
    },
  };
};

const main = async () => {
  const api = await getApi();
  const generated = [];
  for (let i = 0; i < GENERATE_COUNT; i++) {
    generated.push(signup(api));
  }
  // Write the generated array to './signups.gen.js'
  const fileContent = `
    // GENERATED FILE! Regenerate using npm run generate:signups
    export const signups = ${JSON.stringify(generated, null, 2)};
  `;

  try {
    await fs.writeFile('./signups.gen.js', fileContent, 'utf8');
    console.log('Successfully wrote to ./signups.gen.js');
  } catch (err) {
    console.error('Error writing to file:', err);
  }
};

main().catch(console.error).finally(process.exit);
