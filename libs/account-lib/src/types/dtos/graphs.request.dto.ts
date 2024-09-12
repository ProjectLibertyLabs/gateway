// eslint-disable-next-line max-classes-per-file
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#account-lib/types/enums';
import { IsHexValue } from '#account-lib/utils/custom.decorator';
import { Type } from 'class-transformer';
import { AttachmentType, TagTypeDto } from '#content-publishing-lib/dtos';

// eslint-disable-next-line no-shadow
export enum ItemActionType {
  ADD_ITEM = 'ADD_ITEM',
  DELETE_ITEM = 'DELETE_ITEM',
}

export class ItemActionDto {
  @ApiProperty()
  @IsEnum(ItemActionType)
  type: ItemActionType;

  @ApiProperty({ type: String })
  @ValidateIf((o) => o.type === ItemActionType.ADD_ITEM)
  @IsHexValue({ minLength: 2, maxLength: 1024, message: 'encodedPayload should be in hex format!' })
  encodedPayload?: string;

  @ApiProperty()
  @ValidateIf((o) => o.type === ItemActionType.DELETE_ITEM)
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  index?: number;
}

export class ItemizedSignaturePayloadDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(65_536)
  schemaId: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  targetHash: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  expiration: number;

  @ApiProperty()
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => ItemActionDto)
  actions: ItemActionDto[];
}

export class AddNewPublicKeyAgreementRequestDto {
  @ApiProperty({ type: String, description: 'AccountId in hex format' })
  @IsHexValue({ minLength: 64, maxLength: 64, message: 'Account id should be a 32 bytes value in hex format!' })
  accountId: string;

  @ApiProperty()
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => ItemizedSignaturePayloadDto)
  payload: ItemizedSignaturePayloadDto;

  @ApiProperty({ type: String })
  @IsHexValue({ minLength: 128, maxLength: 128, message: 'Proof should be a 64 bytes value in hex format!' })
  proof: string;
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

export class PublicKeyAgreementsKeyPayload {
  @ApiProperty({ type: String, description: 'MSA Id of account to generate a payload for' })
  @IsNumberString()
  msaId: string;

  @ApiProperty({ type: String, description: 'Public key should be a 32 bytes value in hex format!' })
  @IsHexValue({ minLength: 64, maxLength: 64, message: 'Public key should be a 32 bytes value in hex format!' })
  newKey: HexString;
}
