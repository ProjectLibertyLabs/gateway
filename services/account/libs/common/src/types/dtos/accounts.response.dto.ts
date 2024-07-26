import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { Text, u16 } from '@polkadot/types';

export class HandleResponseDTO implements HandleResponse {
  @ApiProperty()
  base_handle: Text;

  @ApiProperty()
  canonical_base: Text;

  @ApiProperty()
  suffix: u16;
}

export class AccountResponse {
  @ApiProperty()
  @IsNotEmpty()
  msaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  handle?: HandleResponse;
}
