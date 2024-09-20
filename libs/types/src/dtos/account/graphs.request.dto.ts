// eslint-disable-next-line max-classes-per-file
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, ValidateIf, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#types/enums/account-enums';
import { IsHexValue } from '#utils/decorators';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { Type } from 'class-transformer';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsSignature } from '#utils/decorators/is-signature.decorator';

// eslint-disable-next-line no-shadow
export enum ItemActionType {
  ADD_ITEM = 'ADD_ITEM',
  DELETE_ITEM = 'DELETE_ITEM',
}

export class ItemActionDto {
  @ApiProperty({
    type: ItemActionType,
    description: 'Action Item type',
    example: 'ADD_ITEM',
  })
  @IsEnum(ItemActionType)
  type: ItemActionType;

  @ApiProperty({
    type: String,
    description: 'encodedPayload to be added',
    example: '0x1234',
  })
  @ValidateIf((o) => o.type === ItemActionType.ADD_ITEM)
  @IsHexValue({ minLength: 2, maxLength: 2048 })
  encodedPayload?: string;

  @ApiProperty({
    type: 'number',
    description: 'index of the item to be deleted',
    example: '0',
  })
  @ValidateIf((o) => o.type === ItemActionType.DELETE_ITEM)
  @IsIntValue({ minValue: 0 })
  index?: number;
}

export class ItemizedSignaturePayloadDto {
  @ApiProperty({
    type: 'number',
    description: 'schemaId related to the payload',
    example: '1',
  })
  @IsSchemaId()
  schemaId: number;

  @ApiProperty({
    type: 'number',
    description: 'targetHash related to the stateful storage',
    example: '1234',
  })
  @IsIntValue({ minValue: 0, maxValue: 4_294_967_296 })
  targetHash: number;

  @ApiProperty({ type: 'number', description: 'expiration block number for this payload', example: '1' })
  @IsIntValue({ minValue: 0, maxValue: 4_294_967_296 })
  expiration: number;

  @ApiProperty({
    example: [
      {
        type: 'ADD_ITEM',
        encodedPayload: '0x1122',
      },
    ],
  })
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => ItemActionDto)
  actions: ItemActionDto[];
}

export class AddNewPublicKeyAgreementRequestDto {
  @ApiProperty({
    type: String,
    description: 'AccountId in hex or SS58 format',
    example: '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N',
  })
  @IsAccountIdOrAddress()
  accountId: string;

  @ApiProperty({
    type: ItemizedSignaturePayloadDto,
  })
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => ItemizedSignaturePayloadDto)
  payload: ItemizedSignaturePayloadDto;

  @ApiProperty({
    description: 'proof is the signature for the payload',
    type: String,
    example:
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85',
  })
  @IsSignature()
  proof: HexString;
}

export class AddNewPublicKeyAgreementPayloadRequest {
  @ApiProperty()
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => ItemizedSignaturePayloadDto)
  payload: ItemizedSignaturePayloadDto;

  @ApiProperty({
    type: String,
    description: 'encodedPayload to be added',
    example: '0x1234',
  })
  @IsHexValue({ minLength: 2, maxLength: 2048 })
  encodedPayload: HexString;
}

export type PublicKeyAgreementRequestDto = AddNewPublicKeyAgreementRequestDto & {
  type: TransactionType.ADD_PUBLIC_KEY_AGREEMENT;
};

export type PublishPublicKeyAgreementRequestDto = PublicKeyAgreementRequestDto;

export class PublicKeyAgreementsKeyPayload {
  @ApiProperty({ description: 'MSA Id representing the target of this request', type: String, example: '3' })
  @IsMsaId()
  msaId: string;

  @ApiProperty({
    type: String,
    description: 'New public key to be added to the account (32-byte value in hex format)',
    example: '0x0ed2f8c714efcac51ca2325cfe95637e5e0b898ae397aa365978b7348a717d0b',
  })
  @IsHexValue({ minLength: 64, maxLength: 64 })
  newKey: HexString;
}
