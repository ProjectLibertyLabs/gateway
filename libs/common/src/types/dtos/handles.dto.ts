/* eslint-disable max-classes-per-file */
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { TransactionType } from '../enums';

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
