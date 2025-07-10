/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GraphKeySubject {
  @ApiProperty({
    description: 'The id type of the VerifiedGraphKeyCredential.',
    required: true,
    example: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
  })
  id: string;

  @ApiProperty({
    description: 'The encoded public key.',
    required: true,
    example: '0xb5032900293f1c9e5822fd9c120b253cb4a4dfe94c214e688e01f32db9eedf17',
  })
  encodedPublicKeyValue: string;

  @ApiProperty({
    description: 'The encoded private key. WARNING: This is sensitive user information!',
    required: true,
    example: '0xd0910c853563723253c4ed105c08614fc8aaaf1b0871375520d72251496e8d87',
  })
  encodedPrivateKeyValue: string;

  @ApiProperty({
    description: 'How the encoded keys are encoded. Only "base16" (aka hex) currently.',
    required: true,
    example: 'base16',
  })
  encoding: string;

  @ApiProperty({
    description: 'Any addition formatting options. Only: "bare" currently.',
    required: true,
    example: 'bare',
  })
  format: string;

  @ApiProperty({
    description: 'The encryption key algorithm.',
    required: true,
    example: 'X25519',
  })
  type: string;

  @ApiProperty({
    description: 'The DSNP key type.',
    required: true,
    example: 'dsnp.public-key-key-agreement',
  })
  keyType: string;
}

export class WalletV2LoginResponseDto {
  @ApiProperty({
    description: 'The ss58 encoded MSA Control Key of the login.',
    required: true,
    type: String,
    example: 'f6cL4wq1HUNx11TcvdABNf9UNXXoyH47mVUwT59tzSFRW8yDH',
  })
  controlKey: string;

  @ApiPropertyOptional({
    description: 'ReferenceId of an associated sign-up request queued task, if applicable',
    required: false,
    type: String,
    example: 'MjY3MjI3NWZlMGM0NTZmYjY3MWU0ZjQxN2ZiMmY5ODkyYzc1NzNiYQo',
  })
  signUpReferenceId?: string;

  @ApiPropertyOptional({
    description: 'Status of associated sign-up request queued task, if applicable',
    required: false,
    type: String,
    example: 'waiting',
  })
  signUpStatus?: string;

  @ApiPropertyOptional({
    description: "The user's MSA Id, if one is already created. Will be empty if it is still being processed.",
    type: String,
    example: '314159265358979323846264338',
  })
  msaId?: string;

  @ApiPropertyOptional({
    description: "The users's validated email",
    type: String,
    example: 'user@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: "The users's validated SMS/Phone Number",
    type: String,
    example: '555-867-5309',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: "The users's Private Graph encryption key.",
    type: GraphKeySubject,
    example: 'f6Y86vfvou3d4RGjYJM2k5L7g1HMjVTDMAtVMDh8g67i3VLZi',
  })
  graphKey?: GraphKeySubject;

  @ApiPropertyOptional({
    description: "The user's recovery secret.",
    type: String,
    example: '69EC-2382-E1E6-76F3-341F-3414-9DD5-CFA5-6932-E418-9385-0358-31DF-AFEA-9828-D3B7',
  })
  recoverySecret?: string;

  @ApiPropertyOptional({
    description: 'Raw parsed credentials received.',
    type: [Object],
    example: [
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
  })
  rawCredentials?: Object[];
}
