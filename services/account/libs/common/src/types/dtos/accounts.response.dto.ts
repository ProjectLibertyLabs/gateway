/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class HandleResponseDTO {
  @ApiProperty()
  base_handle: string;

  @ApiProperty()
  canonical_base: string;

  @ApiProperty()
  suffix: number;
}

export class AccountResponse {
  @ApiProperty()
  @IsNotEmpty()
  msaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  handle?: HandleResponseDTO;
}

export class MsaIdResponse {
  @ApiProperty()
  @IsNotEmpty()
  msaId: string;
}
