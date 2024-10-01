import { DsnpGraphEdgeDto } from './dsnp-graph-edge.dto';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserGraphDto {
  /**
   * MSA Id that is the owner of the graph represented by the graph edges in this object
   * @example '2'
   */
  @IsMsaId()
  dsnpId: string;

  /**
   * Optional array of graph edges in the specific user graph represented by this object
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DsnpGraphEdgeDto)
  dsnpGraphEdges?: DsnpGraphEdgeDto[];
}
