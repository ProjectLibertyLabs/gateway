import { HexString } from '@polkadot/util/types';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

enum AlgoType {
  SR25519 = 'SR25519',
}

export class CreateAccountRequest {
  @IsNotEmpty()
  addProviderSignature: string;

  @IsNotEmpty()
  @IsEnum({ AlgoType })
  algo: AlgoType;

  @IsNotEmpty()
  baseHandle: string;

  @IsNotEmpty()
  encoding: HexString;

  @IsNotEmpty()
  expiration: number;

  @IsNotEmpty()
  handleSignature: string;

  @IsNotEmpty()
  publicKey: string;
}

export class CreateAccountResponse {
  @IsNotEmpty()
  accessToken: string;

  @IsNotEmpty()
  expires: number;
}

export class Account {
  @IsNotEmpty()
  dsnpId: string;

  @IsNotEmpty()
  handle: number;
}

export type AccountsResponse = Account[];
