import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsOptional } from 'class-validator';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

/**
 * Interface for chain filter options
 * @interface IChainWatchOptions
 * @property {number[]} schemaIds - The schema ids for which content should be watched for
 * @property {string[]} msa_ids - The msa ids for which content should be watched for
 */
export class ChainWatchOptionsDto {
  @ApiPropertyOptional({
    description: 'Specific schema ids to watch for',
    required: false,
    type: [String],
    example: [1, 19],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsSchemaId({ each: true })
  schemaIds: number[];

  @ApiPropertyOptional({
    description: 'Specific dsnpIds (msa_id) to watch for',
    required: false,
    type: [String],
    example: ['10074', '100001'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsMsaId({ each: true })
  dsnpIds: string[];
}
