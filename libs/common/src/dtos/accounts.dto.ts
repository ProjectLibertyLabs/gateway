/* eslint-disable max-classes-per-file */
import { HexString } from '@polkadot/util/types';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsHexadecimal,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

enum AlgoType {
  SR25519 = 'SR25519',
}

export class CreateUserAccountRequest {
  @IsNotEmpty()
  addProviderSignature: string;

  @IsNotEmpty()
  @IsEnum({ AlgoType })
  algo: AlgoType;

  @IsNotEmpty()
  baseHandle: string;

  @IsNotEmpty()
  handleSignature: string;

  @IsNotEmpty()
  @IsHexadecimal()
  encoding: string;

  @IsNotEmpty()
  expiration: number;

  @IsNotEmpty()
  publicKey: string;
}

// TODO: Create custom validation that makes sure that if there is a baseHandle, there also is a handleSignature value.
export class CreateProviderAccountRequest {
  @IsNotEmpty()
  @IsEnum({ AlgoType })
  algo: AlgoType;

  @IsOptional()
  baseHandle: string;

  @IsOptional()
  handleSignature: string;

  @IsNotEmpty()
  @IsHexadecimal()
  encoding: string;

  @IsNotEmpty()
  expiration: number;

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
  msaId: string;

  @IsOptional()
  handle: string;
}

export class AccountWithHandle {
  @IsNotEmpty()
  msaId: string;

  @IsNotEmpty()
  handle: string;
}

export type AccountsResponse = Account[];
export type AccountResponse = Account;
