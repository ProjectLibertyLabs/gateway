// eslint-disable-next-line max-classes-per-file
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#account-lib/types/enums';

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

export class AddNewPublicKeyAgreementRequestDto {
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

export class AddNewPublicKeyAgreementPayloadRequest {
  @ApiProperty()
  @IsNotEmpty()
  payload: ItemizedSignaturePayloadDto;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  encodedPayload: HexString;
}

export type PublicKeyAgreementRequestDto = AddNewPublicKeyAgreementRequestDto & {
  type: TransactionType.ADD_PUBLIC_KEY_AGREEMENT;
};

export type PublishPublicKeyAgreementRequestDto = PublicKeyAgreementRequestDto;
