import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PrivacyType } from './privacy.type.dto';
import { GraphKeyPairDto } from './graph.key.pair.dto';
import { ConnectionDto } from './connections.dto';

export class ProviderGraphDto {
  @IsNotEmpty()
  @IsString()
  dsnpId: string;

  @IsNotEmpty()
  @IsString()
  @ValidateNested({ each: true })
  @Type(() => ConnectionDto)
  connections: { data: ConnectionDto[] };

  @IsArray()
  @IsOptional()
  graphKeyPairs?: GraphKeyPairDto[];
}
