import { KeyringPair } from '@polkadot/keyring/types';
import { IsNotEmpty } from 'class-validator';

export class AccountKeys {
  @IsNotEmpty()
  msaId: string;

  @IsNotEmpty()
  keys: KeyringPair;
}

export type KeysResponse = AccountKeys[];
