import { ItemizedSignaturePayloadDto } from '#types/dtos/account/graphs.request.dto';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { IsNumber } from 'class-validator';

export class UpsertPagePayloadDto extends ItemizedSignaturePayloadDto {
  // TODO: make a PageId decorator, this will do for now
  @IsSchemaId()
  pageId: number;
}

export class HcpPublishAllRequestDto {
  addHcpPublicKeyPayload: ItemizedSignaturePayloadDto;
  addContextGroupPRIDEntryPayload: ItemizedSignaturePayloadDto;
  addContetGroupMetadataPayload: UpsertPagePayloadDto;
}
