# Changes to support ICS
The payload body for submitting the ICS AddPublicKey/AddContextGroupPRIDEntry/AddContextGroupMetadata  payloads together is defined as `IcsPublishAllRequestDto`. 



## ICS Add Public Key Payload

We will use `apply_item_actions_with_signature_v2` to add ICS pub key.
The schema is **Itemized, `SignatureRequired` and `AppendOnly`**

The body DTO is `AddNewPublicKeyAgreementRequestDto`, which is already defined.

## Add `ContextGroup` PRID entry

We will use `apply_item_actions_with_signature_v2` to add `ContextGroup` PRID for the provider.
The schema is **`Itemized` and `SignatureRequired`**.

The body DTO is `AddNewPublicKeyAgreementRequestDto`, which is already defined.

## Add `ContextGroup` Metadata
We will use existing extrinsic `upsert_page_with_signature_v2` to store `ContextGroup` Metadata on a chain. The schema
is *
*`Paginated`, `SignatureRequired`.**

The body DTO is a new one, `UpsertPagePayloadDto`

```typescript
import { IsMsaId } from './is-msa-id.decorator';
import { IsSchemaId } from './is-schema-id.decorator';``

export class UpsertPagePayloadDto extends ItemizedSignaturePayloadDto {
  @IsPageId()
  pageId: number;
}
```

## ICS is a part of the `account-api` microservice

For MVI, so that we need to stand up only a single service, ICS endpoints  will be part of the `account-api` microservice.

Attachments are not supported as of this writing and not included in this proposal/update

### `v1/ics/publishAll`

This endpoint requires a body of type `IcsPublishAllRequestDto`, which contains all 3 of the payloads to publish on-chain.

```typescript
    export class IcsPublishAllRequestDto {
    addIcsPublicKeyPayload: ItemizedSignaturePayloadDto;
    addContextGroupPRIDEntryPayload: ItemizedSignaturePayloadDto;
    addContetGroupMetadataPayload: UpsertPagePayloadDto;
    }
    
    @Post(':accountId/addIcsPublicKey')
    @HttpCode(HttpStatus.ACCEPTED)
    async publishAll( 
      @Param() { accountId }: AccountIdDto, 
      @Body() payload: IcsPublishAllRequestDto): Promise <AnnouncementResponseDto > {}
```

## enqueuing ICS requests

```typescript
async enqueueIcsRequest(
  icsRequestType: ICSRequestType,
  accountId: string,
  payload: UpsertPagePayloadDto,
) {}

```
## `account-worker`: Processing ICS jobs
There is a new request processor service for ICS jobs, `icsRequest.publisher.service.ts`

There is a new queue, `icsPublishQueue`, for adding ICS keys and PRIDs. These will call `payWithCapacityBatchAll`, batching all ICS calls.