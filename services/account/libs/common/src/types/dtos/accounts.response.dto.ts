import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';

export class AccountResponse {
  @ApiProperty()
  @IsNotEmpty()
  msaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  handle?: HandleResponse;
}
