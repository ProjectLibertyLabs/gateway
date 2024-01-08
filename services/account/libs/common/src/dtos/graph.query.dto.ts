import { ArrayNotEmpty, ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';
import { GraphKeyPairDto } from './graph.key.pair.dto';

export class GraphsQueryParamsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  dsnpIds: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  grahKeyPairs?: GraphKeyPairDto[];

  @IsOptional()
  @IsString()
  blockNumber?: string;
}
