// eslint-disable-next-line max-classes-per-file
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
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
  proof: HexString;
}

export type CreateHandleRequest = HandleRequest & {
  type: TransactionType.CREATE_HANDLE;
};

export type ChangeHandleRequest = HandleRequest & {
  type: TransactionType.CHANGE_HANDLE;
};

export type PublishHandleRequest = CreateHandleRequest | ChangeHandleRequest;
