// eslint-disable-next-line max-classes-per-file
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#lib/types/enums';

// eslint-disable-next-line no-shadow
export enum ItemActionType {
  ADD_ITEM = 'ADD_ITEM',
  DELETE_ITEM = 'DELETE_ITEM',
}

export class AddItemActionDto {
  type: ItemActionType.ADD_ITEM;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  encodedPayload: HexString;
}

export class DeleteItemActionDto {
  type: ItemActionType.DELETE_ITEM;

  @ApiProperty()
  @IsNotEmpty()
  index: number;
}

export type ItemActionDto = AddItemActionDto | DeleteItemActionDto;

export class ItemizedSignaturePayloadDto {
  @ApiProperty()
  @IsNotEmpty()
  schemaId: number;

  @ApiProperty()
  @IsNotEmpty()
  targetHash: number;

  @ApiProperty()
  @IsNotEmpty()
  expiration: number;

  @IsNotEmpty()
  actions: ItemActionDto[];
}

export class AddNewGraphKeyRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty()
  @IsNotEmpty()
  payload: ItemizedSignaturePayloadDto;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  proof: HexString;
}

export class AddNewGraphKeyPayloadRequest {
  @ApiProperty()
  @IsNotEmpty()
  payload: ItemizedSignaturePayloadDto;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  encodedPayload: HexString;
}

export type GraphKeysRequestDto = AddNewGraphKeyRequestDto & {
  type: TransactionType.ADD_GRAPH_KEY;
};

export type PublishGraphKeysRequestDto = GraphKeysRequestDto;
