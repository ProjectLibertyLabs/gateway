import {
  AddNewPublicKeyAgreementRequestDto,
} from '#types/dtos/account/graphs.request.dto';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { HexString } from '@polkadot/util/types';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertPagePayloadDto extends AddNewPublicKeyAgreementRequestDto {
  // TODO: make a PageId decorator, this will do for now
  @IsSchemaId()
  pageId: number;
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

/**
 * Job data for ICS batch publishing queue
 */
export interface IcsPublishJob {
  accountId: string;
  referenceId: string;
  providerId: string;
  encodedExtrinsics: HexString[];
}
