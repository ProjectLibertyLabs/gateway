# Change proposal to support HCP

The 3 different payload types for these operations already are described in DTOs.

## HCP Add Public Key Payload

We will use apply_item_actions_with_signature_v2 to add HCP pub key.
The schema is **Itemized, SignatureRequired and AppendOnly**

The body DTO is `ItemizedSignaturePayloadDto`.

## Add ContextGroup PRID entry

We will use apply_item_actions_with_signature_v2 to add ContextGroup PRID for the provider.
The schema is **Itemized and SignatureRequired**.

The body DTO is `ItemizedSignaturePayloadDto`

## Add ContextGroup Metadata

We will use existing extrinsic upsert_page_with_signature_v2 to store ContextGroup Metadata on a chain. The schema is *
*Paginated, SignatureRequired.**

The body DTO is a new one, `UpsertPagePayloadDto`

```typescript
import { IsMsaId } from './is-msa-id.decorator';
import { IsSchemaId } from './is-schema-id.decorator';

export class UpsertPagePayloadDto extends ItemizedSignaturePayloadDto {
  @IsPageId()
  schemaId: number;

  @IsContextItemId()
  contextItemId: number;

  @IsContextItemTag()
  contextItemTag: string;

  @IsEncryptedKey()
  encryptedKey: Uint8Array;

  @IsEncryptedContent()
  encryptedContext: Uint8Array;
}
```

## HCP is a part of the content-publishing-api microservice

Because the HCP operations are a kind of content publishing, a new controller will be added to content-publishing-api to
handle HCP operations. The base endpoint is `v1/hcp/`. On
a successful submission to the API, content-publishing-api will submit a job to the correct queue for the operation, and
the content-publishing-worker will process the jobs as usual.

Attachments are included as part of the request and processed similarly to ContentControllerV3.

### `v1/hcp/addHcpPublicKey`

```
    @Post(':accountId/addHcpPublicKey')
    @HttpCode(HttpStatus.ACCEPTED)
    async addHcpPublicKey( @Param() { accountId }: AccountIdDto, 
                           @Body() payload: ItemizedSignaturePayloadDto
                         ): Promise <AnnouncementResponseDto > {
      // there could be some other validation here, perhaps checking that 
      // accountId exists.                       
      return this.apiService.enqueueHcpRequest(
        HcpRequestType.ADD_HCP_PUBLIC_KEY, accountId, payload)
      );
    }
```

### `v1/hcp/addContextGroupPRID`

```
    @Post(':accountId/addContextGroupPRID')
    @HttpCode(HttpStatus.ACCEPTED)
    async addContextGroupPRID( @Param() { accountId }: AccountIdDto, 
                               @Body() payload: ItemizedSignaturePayloadDto
                             ): Promise <AnnouncementResponseDto > {
      // there could be some other validation here, perhaps checking that 
      // accountId exists.                       
      return this.apiService.enqueueHcpRequest(
        HcpRequestType.ADD_CONTEXT_GROUP_PRID, accountId, payload)
      );
    }
```

### `v1/hcp/addContextGroupMetadata`

```
    @Post(':accountId/addContextItem')
    @HttpCode(HttpStatus.ACCEPTED)
    async addContextGroupMetadata( @Param() { accountId }: AccountIdDto, 
                               @Body() payload: UpsertPagePayloadDto
                             ): Promise <AnnouncementResponseDto > {
      // there could be some other validation here, perhaps checking that 
      // accountId exists.                       
      return this.apiService.enqueueHcpRequest(
        HcpRequestType.ADD_CONTEXT_GROUP_METADATA, accountId, payload)
      );
    }
```

## enqueuing HCP requests

```
  async enqueueHcpRequest(
                            hcpRequestType: HCPRequestType,
                            accountId: string,
                            payload: UpsertPagePayloadDto
                          ) {}

```

## content-publishing-worker: Processing HCP jobs

There will be a new request processor service for HCP jobs, `hcpRequest.processor.service.ts`

There will be a new queue for adding HCP keys and PRIDs. These will call `payWithCapacityBatchAll`, batching
`apply_item_actions_with_signature_v2` calls.

There will be a new queue for adding ContextGroupMetadata. It will collect data for adding new context items and once
the queue is full, it will:

1. create batch files with the context data
2. post the batch files to MCP Batch storage
3. Call the Storage API and supply the batch file location
4. Call upsert_page_with_signature_v2 for each context item in the batch file using `payWithCapacityBatchAll` and
   `upsert_page_with_signature_v2`
