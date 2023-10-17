import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';

/**
 * Interface for chain filter options
 * @interface IChainWatchOptions
 * @property {string[]} schemaIds - The schema ids for which content should be watched for
 * @property {string[]} msa_ids - The msa ids for which content should be watched for
 */
export class IChainWatchOptionsDto {
  // Specific schema ids to watch for
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @ApiProperty({
    description: 'Specific schema ids to watch for',
    example: ['1', '19'],
  })
  schemaIds: string[];

  // Specific dsnpIds (msa_id) to watch for
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @ApiProperty({
    description: 'Specific dsnpIds (msa_id) to watch for',
    example: ['10074', '100001'],
  })
  dsnpIds: string[];
}
