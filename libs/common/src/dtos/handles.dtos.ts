import { HexString } from '@polkadot/util/types';
import { IsNotEmpty } from 'class-validator';
import { Account } from './accounts.dto';

export class HandlesRequest {
  @IsNotEmpty()
  pallet: string;

  @IsNotEmpty()
  ectrinsicName: string;

  @IsNotEmpty()
  encodedExtrinsic: HexString;
}

// Is there a case where you can return more than one handle?
export type HandlesResponse = Account;