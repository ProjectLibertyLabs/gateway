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
} from '@projectlibertylabs/frequency-scenario-template';
import { KeyInfoResponse, MessageSourceId } from '@frequency-chain/api-augment/interfaces';
import { KeyringPair } from '@polkadot/keyring/types';
import { AccountId } from '@polkadot/types/interfaces';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import log from 'loglevel';
import { u8aToHex } from '@polkadot/util';

export const FREQUENCY_URL = process.env.FREQUENCY_URL || 'ws://0.0.0.0:9944';
export const BASE_SEED_PHRASE = process.env.SEED_PHRASE || '//Alice';

export async function setupProviderAndUsers(numUsers = 4) {
  await cryptoWaitReady();
  await initialize(FREQUENCY_URL);
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

export const validSiwfV2Create = {
  userPublicKey: {
    encodedValue: 'f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ',
    encoding: 'base58',
    format: 'ss58',
    type: 'Sr25519',
  },
  payloads: [
    {
      signature: {
        algo: 'SR25519',
        encoding: 'base16',
        encodedValue:
          '0x1a27cb6d79b508e1ffc8d6ae70af78d5b3561cdc426124a06f230d7ce70e757e1947dd1bac8f9e817c30676a5fa6b06510bae1201b698b044ff0660c60f18c8a',
      },
      endpoint: {
        pallet: 'msa',
        extrinsic: 'createSponsoredAccountWithDelegation',
      },
      type: 'addProvider',
      payload: {
        authorizedMsaId: 1,
        schemaIds: [5, 7, 8, 9, 10],
        expiration: 24,
      },
    },
    {
      signature: {
        algo: 'SR25519',
        encoding: 'base16',
        encodedValue:
          '0x9eb338773b386ded2e3731ba68ba734c80408b3ad24f92ed3c60342d374a32293851fa8e41d722c72a5a4e765a9e401c68570a8c666ab678e4e5d94aa6825d85',
      },
      endpoint: {
        pallet: 'statefulStorage',
        extrinsic: 'applyItemActionsWithSignatureV2',
      },
      type: 'itemActions',
      payload: {
        schemaId: 7,
        targetHash: 0,
        expiration: 20,
        actions: [
          {
            type: 'addItem',
            payloadHex: '0x40eea1e39d2f154584c4b1ca8f228bb49ae5a14786ed63c90025e755f16bd58d37',
          },
        ],
      },
    },
    {
      signature: {
        algo: 'SR25519',
        encoding: 'base16',
        encodedValue:
          '0xb004140fd8ba3395cf5fcef49df8765d90023c293fde4eaf2e932cc24f74fc51b006c0bebcf31d85565648b4881fa22115e0051a3bdb95ab5bf7f37ac66f798f',
      },
      endpoint: {
        pallet: 'handles',
        extrinsic: 'claimHandle',
      },
      type: 'claimHandle',
      payload: {
        baseHandle: 'ExampleHandle',
        expiration: 24,
      },
    },
  ],
  credentials: [
    {
      '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/undefined-terms/v2'],
      type: ['VerifiedEmailAddressCredential', 'VerifiableCredential'],
      issuer: 'did:web:frequencyaccess.com',
      validFrom: '2024-08-21T21:28:08.289+0000',
      credentialSchema: {
        type: 'JsonSchema',
        id: 'https://schemas.frequencyaccess.com/VerifiedEmailAddressCredential/bciqe4qoczhftici4dzfvfbel7fo4h4sr5grco3oovwyk6y4ynf44tsi.json',
      },
      credentialSubject: {
        id: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
        emailAddress: 'john.doe@example.com',
        lastVerified: '2024-08-21T21:27:59.309+0000',
      },
      proof: {
        type: 'DataIntegrityProof',
        verificationMethod: 'did:web:frequencyaccess.com#z6MkofWExWkUvTZeXb9TmLta5mBT6Qtj58es5Fqg1L5BCWQD',
        cryptosuite: 'eddsa-rdfc-2022',
        proofPurpose: 'assertionMethod',
        proofValue: 'z4jArnPwuwYxLnbBirLanpkcyBpmQwmyn5f3PdTYnxhpy48qpgvHHav6warjizjvtLMg6j3FK3BqbR2nuyT2UTSWC',
      },
    },
    {
      '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/undefined-terms/v2'],
      type: ['VerifiedGraphKeyCredential', 'VerifiableCredential'],
      issuer: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
      validFrom: '2024-08-21T21:28:08.289+0000',
      credentialSchema: {
        type: 'JsonSchema',
        id: 'https://schemas.frequencyaccess.com/VerifiedGraphKeyCredential/bciqmdvmxd54zve5kifycgsdtoahs5ecf4hal2ts3eexkgocyc5oca2y.json',
      },
      credentialSubject: {
        id: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
        encodedPublicKeyValue: '0xb5032900293f1c9e5822fd9c120b253cb4a4dfe94c214e688e01f32db9eedf17',
        encodedPrivateKeyValue: '0xd0910c853563723253c4ed105c08614fc8aaaf1b0871375520d72251496e8d87',
        encoding: 'base16',
        format: 'bare',
        type: 'X25519',
        keyType: 'dsnp.public-key-key-agreement',
      },
      proof: {
        type: 'DataIntegrityProof',
        verificationMethod: 'did:key:z6MktZ15TNtrJCW2gDLFjtjmxEdhCadNCaDizWABYfneMqhA',
        cryptosuite: 'eddsa-rdfc-2022',
        proofPurpose: 'assertionMethod',
        proofValue: 'z2HHWwtWggZfvGqNUk4S5AAbDGqZRFXjpMYAsXXmEksGxTk4DnnkN3upCiL1mhgwHNLkxY3s8YqNyYnmpuvUke7jF',
      },
    },
  ],
};
