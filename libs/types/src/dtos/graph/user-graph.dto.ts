// eslint-disable-next-line max-classes-per-file
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DsnpGraphEdgeDto } from './dsnp-graph-edge.dto';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserGraphDto {
  @ApiProperty({
    description: 'MSA Id that is the owner of the graph represented by the graph edges in this object',
    type: String,
    example: '2',
  })
  @IsMsaId()
  dsnpId: string;

  @ApiPropertyOptional({
    description: 'Optional array of graph edges in the specific user graph represented by this object',
    type: [DsnpGraphEdgeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DsnpGraphEdgeDto)
  dsnpGraphEdges?: DsnpGraphEdgeDto[];
}
