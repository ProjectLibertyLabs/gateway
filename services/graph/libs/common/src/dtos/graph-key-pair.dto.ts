import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { KeyType } from './key-type.enum';
import { HexString } from '@polkadot/util/types';
import { ApiProperty } from '@nestjs/swagger';

// DTO for the graph key pair
export class GraphKeyPairDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Public graph encryption key as a hex string (prefixed with "0x")', type: String })
  publicKey: HexString;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Private graph encryption key as a hex string (prefixed with "0x")', type: String })
  privateKey: string;

  @IsNotEmpty()
  @IsEnum(KeyType)
  @ApiProperty({ description: 'Key type of graph encryption keypair (currently only X25519 supported)', enum: KeyType, example: 'X25519' })
  keyType: KeyType;
}
