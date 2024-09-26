import { IsEnum, IsNotEmpty } from 'class-validator';
import { KeyType } from './key-type.enum';
import { HexString } from '@polkadot/util/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsHexValue } from '#utils/decorators/is-hex-value.decorator';

// DTO for the graph key pair
export class GraphKeyPairDto {
  @ApiProperty({
    description: 'Public graph encryption key as a hex string (prefixed with "0x")',
    type: String,
    example: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
  })
  @IsHexValue({ minLength: 64, maxLength: 64 })
  publicKey: HexString;

  @ApiProperty({
    description: 'Private graph encryption key as a hex string (prefixed with "0x")',
    type: String,
    example: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
  })
  @IsHexValue({ minLength: 64, maxLength: 64 })
  privateKey: string;

  @ApiProperty({
    description: 'Key type of graph encryption keypair (currently only X25519 supported)',
    enum: KeyType,
    example: 'X25519',
  })
  @IsNotEmpty()
  @IsEnum(KeyType)
  keyType: KeyType;
}
