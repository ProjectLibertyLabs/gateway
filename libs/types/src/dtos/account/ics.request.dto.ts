import { AddNewPublicKeyAgreementRequestDto } from '#types/dtos/account/graphs.request.dto';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { HexString } from '@polkadot/util/types';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsHexValue } from '#utils/decorators';
import { IsSignature } from '#utils/decorators/is-signature.decorator';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';

export class UpsertedPageDto {
  /**
   * Schema id pertaining to this storage
   * @example 1
   */
  @IsSchemaId()
  schemaId: number;

  /**
   *  Page id of this storage
   *  @example 1
   */
  @IsSchemaId()
  pageId: number;

  /**
   *  Hash of targeted page
   * @example 1234
   */
  @IsIntValue({ minValue: 0, maxValue: 4_294_967_296 })
  targetHash: number;

  /**
   * The block number at which the signed proof will expire
   * @example 1
   */
  expiration: number;

  /*
   * The encoded page to be persisted
   * @example '0x1234'
   */
  @IsHexValue({ minLength: 2, maxLength: 2048 })
  payload: HexString;
}

export class UpsertPagePayloadDto {
  /**
   * AccountId in hex or SS58 format that signed the payload
   * @example '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
   */
  @IsAccountIdOrAddress()
  accountId: string;

  /**
   * The signature of the payload
   * @example '0x9c66050e827d24862d77f398095dfe59fabcea3cf768ce4fbd5aa74e65d6be27db1e87f56e9c8484a230d405989a89ecaebcdabe95a1c307a4c736cf85444e85'
   */
  @IsSignature()
  signature: HexString;

  /**
   * The payload that `signature` signed
   */
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => UpsertedPageDto)
  payload: UpsertedPageDto;
}

export class IcsPublishAllRequestDto {
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => AddNewPublicKeyAgreementRequestDto)
  addIcsPublicKeyPayload: AddNewPublicKeyAgreementRequestDto;

  @ValidateNested()
  @IsNotEmpty()
  @Type(() => AddNewPublicKeyAgreementRequestDto)
  addContextGroupPRIDEntryPayload: AddNewPublicKeyAgreementRequestDto;

  @ValidateNested()
  @IsNotEmpty()
  @Type(() => UpsertPagePayloadDto)
  addContentGroupMetadataPayload: UpsertPagePayloadDto;
}
