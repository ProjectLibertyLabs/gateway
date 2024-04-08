/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import type { HandleResponse } from '@frequency-chain/api-augment/interfaces';
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

// eslint-disable-next-line no-shadow
enum AlgoType {
  SR25519 = 'SR25519',
}

export class CreateUserAccountRequest {
  @ApiProperty()
  @IsNotEmpty()
  addProviderSignature: string;

  // @ApiProperty()
  // @IsNotEmpty()
  // @IsEnum({ AlgoType })
  // algo: AlgoType;

  @ApiProperty()
  @IsNotEmpty()
  baseHandle: string;

  @ApiProperty()
  @IsNotEmpty()
  handleSignature: string;

  // @ApiProperty()
  // @IsNotEmpty()
  // @IsHexadecimal()
  // encoding: string;

  // @ApiProperty()
  // @IsNotEmpty()
  // expiration: number;

  @ApiProperty()
  @IsNotEmpty()
  publicKey: string;
}

// TODO: Create custom validation that makes sure that if there is a baseHandle, there also is a handleSignature value.
export class CreateProviderAccountRequest {
  @IsNotEmpty()
  @IsEnum({ AlgoType })
  algo: AlgoType;

  @IsOptional()
  baseHandle?: string;

  @IsOptional()
  handleSignature?: string;

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
  msaId: number;

  @IsOptional()
  handle?: HandleResponse | null;
}

export class AccountWithHandle {
  @IsNotEmpty()
  msaId: number;

  @IsNotEmpty()
  handle: HandleResponse;
}

export type AccountsResponse = Account[];
export type AccountResponse = Account;
