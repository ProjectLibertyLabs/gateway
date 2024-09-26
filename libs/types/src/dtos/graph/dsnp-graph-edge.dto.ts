import { ApiProperty } from '@nestjs/swagger';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';

export class DsnpGraphEdgeDto {
  @ApiProperty({ description: 'MSA Id of the user represented by this graph edge', type: String, example: '3' })
  @IsMsaId()
  userId: string;

  @ApiProperty({
    description: 'Block number when connection represented by this graph edge was created',
    type: Number,
    example: 12,
  })
  @IsIntValue({ minValue: 0 })
  since: number;
}
