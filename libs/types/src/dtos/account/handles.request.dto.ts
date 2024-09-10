// eslint-disable-next-line max-classes-per-file
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '../../enums/account-enums';

class HandlePayloadDto {
  @ApiProperty()
  @IsNotEmpty()
  baseHandle: string;

  @ApiProperty()
  @IsNotEmpty()
  expiration: number;
}

export class HandleRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty()
  @IsNotEmpty()
  payload: HandlePayloadDto;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  proof: HexString;
}

export class ChangeHandlePayloadRequest {
  @ApiProperty()
  @IsNotEmpty()
  payload: HandleRequestDto['payload'];

  @ApiProperty()
  @IsNotEmpty()
  encodedPayload: HexString;
}

export type CreateHandleRequest = HandleRequestDto & {
  type: TransactionType.CREATE_HANDLE;
};

export type ChangeHandleRequest = HandleRequestDto & {
  type: TransactionType.CHANGE_HANDLE;
};

export type PublishHandleRequestDto = CreateHandleRequest | ChangeHandleRequest;
