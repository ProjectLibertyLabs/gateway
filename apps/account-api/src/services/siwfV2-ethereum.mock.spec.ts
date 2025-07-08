import type { SiwfResponse } from '@projectlibertylabs/siwfv2';

// Mock Server Authorization Codes:
// validEthereumSiwfAddDelegationResponsePayload
// validEtehreumSiwfLoginResponsePayload
// validEthereumSiwfNewUserResponse
// Anything else? 404

export const validEthereumSiwfAddDelegationResponsePayload: SiwfResponse = {
  userPublicKey: {
    encodedValue: '0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac',
    encoding: 'base16',
    format: 'eip-55',
    type: 'Secp256k1',
  },
  payloads: [
    {
      signature: {
        algo: 'SECP256K1',
        encoding: 'base16',
        encodedValue:
          '0xb3e41e53373649d089455965791c47f695f519eb21bd322febf04bd05f2b50b72c395c4490ac6cd0d108d0a77f625aea8b1f0096befc359936669d620f5aad7e1c',
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

export const validEthereumSiwfLoginResponsePayload = {
  userPublicKey: {
    encodedValue: '0xf24ff3a9cf04c71dbc94d0b566f7a27b94566cac',
    encoding: 'base16',
    format: 'eip-55',
    type: 'Secp256k1',
  },
  payloads: [
    {
      signature: {
        algo: 'SECP256K1',
        encoding: 'base16',
        encodedValue:
          '0xd6b4aa1d6e9ef99086d993ff5b45af15003758911b97636d81d134d5e36f6d8277bfbd687d72ca6daf8aea7d11b0ccd4eef9708ab1ee4b843b272be23937d0321b',
      },
      type: 'login',
      payload: {
        message:
          'localhost wants you to sign in with your Frequency account:\n0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac\n\n\n\nURI: https://testnet.frequencyaccess.com/signin/confirm\nNonce: N6rLwqyz34oUxJEXJ\nIssued At: 2024-03-05T23:18:03.041Z\nExpiration Time: 2060-03-05T23:23:03.041Z',
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

// From siwf/docs/Src/DataStructures/Secp256k1
export const validEthereumSiwfNewUserResponse: SiwfResponse = {
  userPublicKey: {
    encodedValue: '0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac',
    encoding: 'base16',
    format: 'eip-55',
    type: 'Secp256k1',
  },
  payloads: [
    {
      signature: {
        algo: 'SECP256K1',
        encoding: 'base16',
        encodedValue:
          '0xb3e41e53373649d089455965791c47f695f519eb21bd322febf04bd05f2b50b72c395c4490ac6cd0d108d0a77f625aea8b1f0096befc359936669d620f5aad7e1c',
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
        algo: 'SECP256K1',
        encoding: 'base16',
        encodedValue:
          '0xfd1d273752f6494cf64bc7091b37fce35f1bdd861b676c7f5ee392675453764f2e322797b6a5f676e6716738c5ba8fabe82de83dbe5bf9d9e771ef717ff036241c',
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
        algo: 'SECP256K1',
        encoding: 'base16',
        encodedValue:
          '0xeaa194e6f0074d777633522370fc0f74b200d933e1f1219bc8379ace1fb42759463e7b71d796abf839f2c1f78ecd0af4872010300afac4fbdb44d584c4686e041b',
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
