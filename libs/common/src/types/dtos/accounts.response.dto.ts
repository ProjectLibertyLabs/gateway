import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class AccountResponse {
  @ApiProperty()
  @IsNotEmpty()
  msaId: number;

  @ApiPropertyOptional()
  @IsOptional()
  displayHandle?: string;
}
