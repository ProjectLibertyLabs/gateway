import type { SiwfResponse } from '@projectlibertylabs/siwfv2';

export const validSiwfResponsePayload: SiwfResponse = {
  userPublicKey: {
    encodedValue: 'f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ',
    encoding: 'base58',
    format: 'ss58',
    type: 'Sr25519',
  },
  payloads: [
    {
      signature: {
        algo: 'Sr25519',
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
