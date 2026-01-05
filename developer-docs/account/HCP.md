# Change proposal to support ICS

The 3 different payload types for these operations already are described in DTOs.

## ICS Add Public Key Payload

We will use `apply_item_actions_with_signature_v2` to add ICS pub key.
The schema is **Itemized, `SignatureRequired` and `AppendOnly`**

The body DTO is `ItemizedSignaturePayloadDto`.

## Add `ContextGroup` PRID entry

We will use `apply_item_actions_with_signature_v2` to add `ContextGroup` PRID for the provider.
The schema is **`Itemized` and `SignatureRequired`**.

The body DTO is `ItemizedSignaturePayloadDto`

## Add `ContextGroup` Metadata

We will use existing extrinsic `upsert_page_with_signature_v2` to store `ContextGroup` Metadata on a chain. The schema
is *
*`Paginated`, `SignatureRequired`.**

The body DTO is a new one, `UpsertPagePayloadDto`

```typescript
import { IsMsaId } from './is-msa-id.decorator';
import { IsSchemaId } from './is-schema-id.decorator';

export class UpsertPagePayloadDto extends ItemizedSignaturePayloadDto {
  @IsPageId()
  pageId: number;
}
```

## ICS is a part of the `account-api` microservice

For MVI, so that we need to stand up only a single service, and because `account-api`'s `siwa` endpoint will be called,
ICS endpoints
will be part of the `account-api` microservice.

Attachments are not supported as of this writing and not included in this proposal/update

### `v1/ics/publishAll`

This endpoint requires a body of type `IcsPublishAllRequestDto`, which contains all 3 of the payloads to publish
on-chain.

```
    export class IcsPublishAllRequestDto {
    addIcsPublicKeyPayload: ItemizedSignaturePayloadDto;
    addContextGroupPRIDEntryPayload: ItemizedSignaturePayloadDto;
    addContetGroupMetadataPayload: UpsertPagePayloadDto;
    }
    
    @Post(':accountId/addIcsPublicKey')
    @HttpCode(HttpStatus.ACCEPTED)
    async publishAll( 
      @Param() { accountId }: AccountIdDto, 
      @Body() payload: IcsPublishAllRequestDto): Promise <AnnouncementResponseDto > {
      
        // check that the accountId has an MSA on chain as a fast, early failure.
        // it's not necessary to deserialize the payload to verify the id matches
        const api = await this.blockchainService.getApi();
        const res = await api.query.msa.publicKeyToMsaId(accountId);
        if (res.isNone) {
          throw new NotFoundException(`MSA ID for account ${accountId} not found`);
        }
        return this.apiService.enqueueIcsRequest(
        IcsRequestType.ADD_ICS_PUBLIC_KEY, accountId, payload);
    }
```

## enqueuing ICS requests

```

async enqueueIcsRequest(
icsRequestType: ICSRequestType,
accountId: string,
payload: UpsertPagePayloadDto
) {}

```

## `content-publishing-worker`: Processing ICS jobs

There will be a new request processor service for ICS jobs, `icsRequest.processor.service.ts`

There will be a new queue for adding ICS keys and PRIDs. These will call `payWithCapacityBatchAll`, batching all ICS
calls.