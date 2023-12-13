import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { KeyType } from './key.type.dto';

// DTO for the graph key pair
export class GraphKeyPairDto {
  @IsNotEmpty()
  @IsString()
  publicKey: string;

  @IsNotEmpty()
  @IsString()
  privateKey: string;

  @IsNotEmpty()
  @IsEnum(KeyType)
  keyType: KeyType;
}
