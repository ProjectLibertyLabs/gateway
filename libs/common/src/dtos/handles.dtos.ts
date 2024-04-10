import { HexString } from '@polkadot/util/types';
import { IsNotEmpty } from 'class-validator';
import { AccountWithHandle } from './accounts.dto';
import { KeyringPair } from '@polkadot/keyring/types';
import { AccountId } from '@polkadot/types/interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class HandlesRequest {
  @ApiProperty()
  @IsNotEmpty()
  accountId: AccountId;

  @ApiProperty()
  @IsNotEmpty()
  baseHandle: string;
  // @IsNotEmpty()
  // pallet: string;

  // @IsNotEmpty()
  // ectrinsicName: string;

  // @IsNotEmpty()
  // encodedExtrinsic: HexString;
}

export type HandlesResponse = AccountWithHandle;
