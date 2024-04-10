import { IsNotEmpty } from 'class-validator';
import { AccountId } from '@polkadot/types/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { HandleResponse } from '@frequency-chain/api-augment/interfaces';
import { TransactionType } from '../enums';

export class HandleRequest {
  @ApiProperty()
  @IsNotEmpty()
  accountId: AccountId['toHuman'];

  @ApiProperty()
  @IsNotEmpty()
  baseHandle: string;
}

export type PublishHandleRequest = HandleRequest & {
  type: TransactionType.CHANGE_HANDLE | TransactionType.CREATE_HANDLE;
};

export type Handle = HandleResponse;
