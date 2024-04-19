import { IsNotEmpty } from 'class-validator';
import { AccountId } from '@polkadot/types/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { TransactionType } from '../enums';
import { Bytes } from '@polkadot/types';

class HandlePayload {
  @ApiProperty()
  @IsNotEmpty()
  baseHandle: string;

  @ApiProperty()
  @IsNotEmpty()
  expiration: number;
}

export class HandleRequest {
  @ApiProperty()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty()
  @IsNotEmpty()
  payload: HandlePayload;

  @ApiProperty()
  @IsNotEmpty()
  proof: string;
}

export type CreateHandleRequest = HandleRequest & {
  type: TransactionType.CREATE_HANDLE;
};

export type ChangeHandleRequest = HandleRequest & {
  type: TransactionType.CHANGE_HANDLE;
};

export type PublishHandleRequest = CreateHandleRequest | ChangeHandleRequest;

export type Handle = HandleResponse;
