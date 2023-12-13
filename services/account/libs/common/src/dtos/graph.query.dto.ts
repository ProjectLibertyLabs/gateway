import { ArrayNotEmpty, ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';

export class GraphsQueryParamsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  dsnpIds: string[];

  @IsOptional()
  @IsString()
  blockNumber?: string;
}
