import type { SiwfResponse } from '@projectlibertylabs/siwfv2';
import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import { validEthereumSiwfLoginResponsePayload } from '#account-api/services/siwfV2-ethereum.mock.spec';
import { URL } from 'node:url';

// Mock Server Authorization Codes:
// validSiwfAddDelegationResponsePayload
// validSiwfLoginResponsePayload
// validSiwfNewUserResponse
// validSiwfNewUserResponseWithRecovery
// Anything else? 404

// These are payloads for testing signing in/up with Frequency Access.
// The authorization codes are mocked to be the same
// name as the payloads below.  Frequency Access would be generating random
// authorization codes in production.

export const validSiwfAddDelegationResponsePayload: SiwfResponse = {
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
          '0xbac399831b9e3ad464a16e62ad1252cc8344a2c52f80252b2aa450a06ae2362f6f4afcaca791a81f28eaa99080e2654bdbf1071a276213242fc153cca43cfa8e',
      },
      endpoint: {
        pallet: 'msa',
        extrinsic: 'grantDelegation',
      },
      type: 'addProvider',
      payload: {
        authorizedMsaId: 1,
        schemaIds: [5, 7, 8, 9, 10],
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
    {
      '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/undefined-terms/v2'],
      type: ['VerifiedPhoneNumberCredential', 'VerifiableCredential'],
      issuer: 'did:web:frequencyaccess.com',
      validFrom: '2024-08-21T21:28:08.289+0000',
      credentialSchema: {
        type: 'JsonSchema',
        id: 'https://schemas.frequencyaccess.com/VerifiedPhoneNumberCredential/bciqjspnbwpc3wjx4fewcek5daysdjpbf5xjimz5wnu5uj7e3vu2uwnq.json',
      },
      credentialSubject: {
        id: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
        phoneNumber: '+01-234-867-5309',
        lastVerified: '2024-08-21T21:27:59.309+0000',
      },
      proof: {
        type: 'DataIntegrityProof',
        verificationMethod: 'did:web:frequencyaccess.com#z6MkofWExWkUvTZeXb9TmLta5mBT6Qtj58es5Fqg1L5BCWQD',
        cryptosuite: 'eddsa-rdfc-2022',
        proofPurpose: 'assertionMethod',
        proofValue: 'z5sJ2CjHX1wwgzfFGoZNocxeFKd2ffpo5TVgUvdaSkYq1M6gF7UjpYfePo97QoZgmiWdgPAWPjxFvGBysaxHV8DZ4',
      },
    },
  ],
};

export const validSiwfLoginResponsePayload: SiwfResponse = {
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
          '0x84a4e03344b07d64087ebdf47b2c8c679aa7de78179689988992609f1b83c34f6086c7de99ef41c5325cce64d148624e716c605d355f22d1281f6d23f546f584',
      },
      type: 'login',
      payload: {
        message:
          'localhost wants you to sign in with your Frequency account:\nf6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ\n\n\n\nURI: https://testnet.frequencyaccess.com/signin/confirm\nNonce: N6rLwqyz34oUxJEXJ\nIssued At: 2024-03-05T23:18:03.041Z\nExpiration Time: 2060-03-05T23:23:03.041Z',
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

export const validSiwfNewUserResponse: SiwfResponse = {
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

export const validSiwfNewUserResponseWithRecovery: SiwfResponse = {
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
          '0xcc469ce5304768c16164e42442dfe40769a742786bd360cabb8fdaf15a25765c9c18d71b8c88972f42ab6f938e703f4cc4035656a7c9dd193aca2626a3d7f887',
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
          '0x90583e8c2bdb46afd62caed94eb2f6c99f66308a91591da1447d2ef781002622ef12b960fc86de88121e243ad3cf5e15a615d48e7c2e20c860a7adf6199cfb88',
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
          '0xa291b22f6d3e21258200f127ea23b741248a584208d96783fb3599a733a87c2e67fe427491a6aa984e3982e5ccafcbb7f170a17a5db6082230a1c8e4ac2a3f8c',
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
    {
      signature: {
        algo: 'SR25519',
        encoding: 'base16',
        encodedValue:
          '0x04084ae8ced4e9e27cbc27bf25a3c34cb6faeec5fbdcb331021d98dc4a211f17256c08aa96defcb597f3867b08b3a901d61c8ce36e0f4ccda0bf79458ad39580',
      },
      endpoint: {
        pallet: 'msa',
        extrinsic: 'addRecoveryCommitment',
      },
      type: 'recoveryCommitment',
      payload: {
        recoveryCommitmentHex: '0xeea1e39d2f154584c4b1ca8f228bb49ae5a14786ed63c90025e755f16bd58d37',
        expiration: 20,
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
    },
    {
      '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/undefined-terms/v2'],
      type: ['VerifiedRecoverySecretCredential', 'VerifiableCredential'],
      issuer: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
      validFrom: '2024-08-21T21:28:08.289+0000',
      credentialSchema: {
        type: 'JsonSchema',
        id: 'https://schemas.frequencyaccess.com/VerifiedRecoverySecretCredential/bciqpg6qm4rnu2j4v6ghxqqgwkggokwvxs3t2bexbd3obkypkiryylxq.json',
      },
      credentialSubject: {
        id: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
        recoverySecret: '69EC-2382-E1E6-76F3-341F-3414-9DD5-CFA5-6932-E418-9385-0358-31DF-AFEA-9828-D3B7',
      },
    },
  ],
};

const responseMap = new Map([
  ['validSiwfAddDelegationResponsePayload', validSiwfAddDelegationResponsePayload],
  ['validSiwfLoginResponsePayload', validSiwfLoginResponsePayload],
  ['validSiwfNewUserResponse', validSiwfNewUserResponse],
  ['validSiwfNewUserResponseWithRecovery', validSiwfNewUserResponseWithRecovery],
  ['validEthereumSiwfLoginResponsePayload', validEthereumSiwfLoginResponsePayload],
]);

export function createMockSiwfServer(port: number): Server {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url, 'http://localhost');
    const code = url.searchParams.get('authorizationCode');

    // console.log('MOCK SIWF SERVER REQUEST RECEIVED', url.toString());

    if (req.method === 'GET' && url.pathname === '/api/payload' && responseMap.has(code)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseMap.get(code)));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port);
  return server;
}
