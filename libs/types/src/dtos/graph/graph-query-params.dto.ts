import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { GraphKeyPairDto } from './graph-key-pair.dto';
import { PrivacyType } from './privacy-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class GraphsQueryParamsDto {
  @ApiProperty({
    description: 'Array of MSA Ids for which to query graphs',
    example: ['2', '3', '4', '5'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsMsaId({ each: true })
  dsnpIds: string[];

  @ApiProperty({ description: 'Graph type to query (public or private)', enum: PrivacyType, example: 'public' })
  @IsEnum(PrivacyType)
  privacyType: PrivacyType;

  @ApiPropertyOptional({
    description:
      'Graph encryption keypairs for the users requested in `dsnpIds`. (Only for `privacyType` === "private"',
    type: [GraphKeyPairDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphKeyPairDto)
  graphKeyPairs?: GraphKeyPairDto[];
}
