import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class AccountResponse {
  @IsNotEmpty()
  msaId: number;

  @IsOptional()
  handle?: HandleResponse | null;
}
