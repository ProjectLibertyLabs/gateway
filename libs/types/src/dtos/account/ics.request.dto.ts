import {
  AddNewPublicKeyAgreementRequestDto,
} from '#types/dtos/account/graphs.request.dto';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { HexString } from '@polkadot/util/types';

// export interface PaginatedUpsertSignaturePayloadV2 {
//   schemaId?: u16;
//   pageId?: u16;
//   targetHash?: u32;
//   expiration?: any;
//   payload?: any;
// }

export class UpsertPagePayloadDto extends AddNewPublicKeyAgreementRequestDto {
  // TODO: make a PageId decorator, this will do for now
  @IsSchemaId()
  pageId: number;
}

export class IcsPublishAllRequestDto {
  addIcsPublicKeyPayload: AddNewPublicKeyAgreementRequestDto;
  addContextGroupPRIDEntryPayload: AddNewPublicKeyAgreementRequestDto;
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
