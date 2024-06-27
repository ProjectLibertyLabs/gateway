import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { GraphKeyPairDto } from './graph-key-pair.dto';
import { PrivacyType } from './privacy-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GraphsQueryParamsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @ApiProperty({ description: 'Array of MSA IDs for which to query graphs', example: [2, 3, 4, 5], type: [String] })
  dsnpIds: string[];

  @IsEnum(PrivacyType)
  @ApiProperty({ description: 'Graph type to query (public or private)', enum: PrivacyType, example: 'public' })
  privacyType: PrivacyType;

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({ description: 'Graph encryption keypairs for the users requested in `dsnpIds`. (Only for `privacyType` === "private"', type: [GraphKeyPairDto] })
  graphKeyPairs?: GraphKeyPairDto[];
}
