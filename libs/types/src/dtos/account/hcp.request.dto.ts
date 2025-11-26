import {
  AddNewPublicKeyAgreementRequestDto,
  ItemizedSignaturePayloadDto,
} from '#types/dtos/account/graphs.request.dto';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';

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

export class HcpPublishAllRequestDto {
  addHcpPublicKeyPayload: AddNewPublicKeyAgreementRequestDto;
  addContextGroupPRIDEntryPayload: AddNewPublicKeyAgreementRequestDto;
  addContentGroupMetadataPayload: UpsertPagePayloadDto;
}
