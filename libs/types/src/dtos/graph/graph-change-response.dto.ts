import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GraphChangeResponseDto {
  @ApiProperty({
    minLength: 1,
    description: 'Reference ID by which the results/status of a submitted GraphChangeRequest may be retrieved',
    type: String,
  })
  @MinLength(1)
  @IsString()
  referenceId: string;
}
