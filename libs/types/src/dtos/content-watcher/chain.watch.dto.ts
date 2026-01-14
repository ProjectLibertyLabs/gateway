import { ArrayNotEmpty, ArrayUnique, IsArray, IsOptional } from 'class-validator';
import { IsIntentId, IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

/**
 * Interface for chain filter options
 * @property {number[]} intentIds - The Intent ids for which content should be watched for
 * @property {string[]} msa_ids - The msa ids for which content should be watched for
 */
export class ChainWatchOptionsDto {
  /**
   * Specific Intent ids to watch for
   * @example [1, 19]
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIntentId({ each: true })
  intentIds?: number[];

  /**
   * Specific dsnpIds (msa_id) to watch for
   * @example ['10074', '100001']
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsMsaId({ each: true })
  dsnpIds?: string[];
}
