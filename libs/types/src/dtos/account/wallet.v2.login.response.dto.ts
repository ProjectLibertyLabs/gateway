/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CredentialResponse {
  @ApiProperty({
    description: 'The type of the Credential.',
    required: true,
    example: 'VerifiedGraphKeyCredential',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'The Credential Subject from the Credential.',
    required: true,
    example: {
      type: 'VerifiedGraphKeyCredential',
      subject: {
        id: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
        encodedPublicKeyValue: '0xb5032900293f1c9e5822fd9c120b253cb4a4dfe94c214e688e01f32db9eedf17',
        encodedPrivateKeyValue: '0xd0910c853563723253c4ed105c08614fc8aaaf1b0871375520d72251496e8d87',
        encoding: 'base16',
        format: 'bare',
        type: 'X25519',
        keyType: 'dsnp.public-key-key-agreement',
      },
    },
  })
  subject: Record<string, string>;
}

export class WalletV2LoginResponseDto {
  @ApiProperty({
    description: 'The ss58 encoded MSA Control Key of the login.',
    required: true,
    type: String,
    example: 'f6cL4wq1HUNx11TcvdABNf9UNXXoyH47mVUwT59tzSFRW8yDH',
  })
  @IsString()
  controlKey: string;

  @ApiPropertyOptional({
    description: "The user's MSA Id, if one is already created. Will be empty if it is still being processed.",
    type: String,
    example: '314159265358979323846264338',
  })
  @IsString()
  @IsOptional()
  msaId?: string;

  @ApiPropertyOptional({
    description: 'Verified credentials received.',
    type: [CredentialResponse],
    example: [
      {
        type: 'VerifiedGraphKeyCredential',
        subject: {
          id: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
          encodedPublicKeyValue: '0xb5032900293f1c9e5822fd9c120b253cb4a4dfe94c214e688e01f32db9eedf17',
          encodedPrivateKeyValue: '0xd0910c853563723253c4ed105c08614fc8aaaf1b0871375520d72251496e8d87',
          encoding: 'base16',
          format: 'bare',
          type: 'X25519',
          keyType: 'dsnp.public-key-key-agreement',
        },
      },
    ],
  })
  @IsArray()
  credentials?: CredentialResponse[];
}
