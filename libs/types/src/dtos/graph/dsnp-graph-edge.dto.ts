import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';

export class DsnpGraphEdgeDto {
  /**
   * MSA Id of the user represented by this graph edge
   * @example '3'
   */
  @IsMsaId()
  userId: string;

  /**
   * Block number when connection represented by this graph edge was created
   * @example 12
   */
  @IsIntValue({ minValue: 0 })
  since: number;
}
