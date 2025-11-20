# Change proposal to support HCP

## HCP Add Public Key Payload

We will use apply_item_actions_with_signature_v2 to add HCP pub key.
The schema is **Itemized, SignatureRequired and AppendOnly**

* User’s control key (public)
* User’s signature on payload
* Hcp public key schema_id (needs to be published on chain)
* Target_hash is required (it’s 0 for empty page)
* Expiration Block for payload (dependent on chain)
* Actions blob (Dependent on the hcp-sdk and hcp schema definition)

```typescript
export class AddHcpPubliKeyPayloadRequestDto extends ItemizedSignaturePayloadDto {
}
```

## Add ContextGroup PRID entry

We will use apply_item_actions_with_signature_v2 to add ContextGroup PRID for the provider.
The schema is **Itemized and SignatureRequired**.

### Required

```typescript
export class AddContextGroupPRIDPayloadRequestDto extends ItemizedSignaturePayloadDto {
}

```

## Add ContextGroup Metadata

We will use existing extrinsic upsert_page_with_signature_v2 to store ContextGroup Metadata on a chain. The schema is *
*Paginated, SignatureRequired.**

```typescript
import { IsMsaId } from './is-msa-id.decorator';
import { IsSchemaId } from './is-schema-id.decorator';

export class UpsertPagePayloadDto {
  @IsMsaId()
  msaId: number;

  @IsSchemaId()
  schemaId: number;

  @IsPageId()
  schemaId: number;

  /**
   * targetHash related to the stateful storage
   * @example 1234
   */
  @IsIntValue({ minValue: 0, maxValue: 4_294_967_296 })
  targetHash: number;

  @IsUint8Array()
  payload
}


export class AddContextGroupMetadataPayloadRequestDto extends UpsertPagePayloadDto {
}
```


