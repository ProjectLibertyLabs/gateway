/* eslint-disable max-classes-per-file */
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class Account {
  @IsNotEmpty()
  msaId: number;

  @IsOptional()
  handle?: HandleResponse | null;
}

export type AccountResponse = Account;
