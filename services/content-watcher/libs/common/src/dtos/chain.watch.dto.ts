import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';

/**
 * Interface for chain filter options
 * @interface IChainWatchOptions
 * @property {number[]} schemaIds - The schema ids for which content should be watched for
 * @property {string[]} msa_ids - The msa ids for which content should be watched for
 */
export class ChainWatchOptionsDto {
  // Specific schema ids to watch for
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @ApiProperty({
    type: 'array',
    items: {
      type: 'number',
    },
    description: 'Specific schema ids to watch for',
    required: false,
    example: [1, 19],
  })
  schemaIds: number[];

  // Specific dsnpIds (msa_id) to watch for
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @ApiProperty({
    description: 'Specific dsnpIds (msa_id) to watch for',
    required: false,
    example: ['10074', '100001'],
  })
  dsnpIds: string[];
}
