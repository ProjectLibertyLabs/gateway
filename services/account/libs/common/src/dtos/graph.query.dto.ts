import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { GraphKeyPairDto } from './graph.key.pair.dto';
import { PrivacyType } from './privacy.type.dto';

export class GraphsQueryParamsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  dsnpIds: string[];

  @IsEnum(PrivacyType)
  privacyType: PrivacyType;

  @IsOptional()
  @IsArray()
  graphKeyPairs: GraphKeyPairDto[];
}
