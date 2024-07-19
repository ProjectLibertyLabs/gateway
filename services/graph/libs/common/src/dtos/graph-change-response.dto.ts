import { ApiProperty } from '@nestjs/swagger';

export class GraphChangeRepsonseDto {
  @ApiProperty({ description: 'Reference ID by which the results/status of a submitted GraphChangeRequest may be retrieved', type: String })
  referenceId: string;
}
