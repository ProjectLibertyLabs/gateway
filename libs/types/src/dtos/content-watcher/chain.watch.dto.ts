import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt, IsNumberString, IsOptional, Max, Min } from 'class-validator';

/**
 * Interface for chain filter options
 * @interface IChainWatchOptions
 * @property {number[]} schemaIds - The schema ids for which content should be watched for
 * @property {string[]} msa_ids - The msa ids for which content should be watched for
 */
export class ChainWatchOptionsDto {
  /**
   * Specific schema ids to watch for
   * @example [1, 19]
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(65_536, { each: true })
  schemaIds?: number[];

  /**
   * Specific dsnpIds (msa_id) to watch for
   * @example ['10074', '100001']
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsNumberString({ no_symbols: true }, { each: true })
  dsnpIds?: string[];
}
