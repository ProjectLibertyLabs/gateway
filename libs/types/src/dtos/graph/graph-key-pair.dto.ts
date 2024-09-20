import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { KeyType } from './key-type.enum';
import { HexString } from '@polkadot/util/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsHexValue } from '#utils/decorators/is-hex-value.decorator';

// DTO for the graph key pair
export class GraphKeyPairDto {
  @IsHexValue({ minLength: 64, maxLength: 64 })
  @ApiProperty({
    description: 'Public graph encryption key as a hex string (prefixed with "0x")',
    type: String,
    example: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
  })
  publicKey: HexString;

  @IsHexValue({ minLength: 64, maxLength: 64 })
  @ApiProperty({
    description: 'Private graph encryption key as a hex string (prefixed with "0x")',
    type: String,
    example: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
  })
  privateKey: string;

  @IsNotEmpty()
  @IsEnum(KeyType)
  @ApiProperty({
    description: 'Key type of graph encryption keypair (currently only X25519 supported)',
    enum: KeyType,
    example: 'X25519',
  })
  keyType: KeyType;
}
