# Technical Proposal: Generic Schema Batching Support

**Issue**: [#731 - Generic Batching for any Batched Schema](https://github.com/ProjectLibertyLabs/gateway/issues/731)  
**Date**: 2025-10-15  
**Authors**: Gateway Team  
**Status**: DRAFT - Review Required  

---
[text](generic-schema-batching-proposal.md)
## Executive Summary

This proposal addresses the need for the Gateway to support batching of any schema type without requiring schema-specific code changes. Currently, the Gateway has hard-coded DSNP schema mappings and content-aware endpoints, making it impossible to batch AT Protocol schemas or other custom schemas without significant code modifications.

We propose two complementary solutions:
- **Solution 1**: Schema Registry with Dynamic Discovery (Foundation)
- **Solution 2**: Hybrid Architecture (Complete Solution)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Solution 1: Schema Registry with Dynamic Discovery](#solution-1-schema-registry-with-dynamic-discovery)
4. [Solution 2: Hybrid Architecture](#solution-4-hybrid-architecture)
5. [API Specifications](#api-specifications)
6. [Implementation Plan](#implementation-plan)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Risk Analysis](#risk-analysis)
10. [Alternatives Considered](#alternatives-considered)
11. [Open Questions](#open-questions)

---

## Problem Statement

### Current Limitations

1. **Hard-coded Schema Mappings**: The Gateway maintains a static map of DSNP schemas in [`libs/types/src/constants/schemas.ts`](https://github.com/ProjectLibertyLabs/gateway/blob/main/libs/types/src/constants/schemas.ts), preventing support for dynamically registered schemas. (we probably want to query chain to generate this mapping on the fly, but it will slow down startup time)

2. **Content-Specific Endpoints**: Each announcement type requires its own DTO, validation, transformation logic, and endpoint (e.g., `/broadcast`, `/reply`).

3. **No AT Protocol Support**: AT Protocol schemas deployed on Frequency testnet cannot be batched because they're not in the hard-coded schema list.

4. **Brittle Architecture**: Adding a new schema type requires changes across multiple files:
   - Schema constants
   - DTOs
   - Validators
   - Announcement processors
   - API controllers
   - Queue mappings

5. **REST API ≠ On-Chain Format**: The current API accepts DSNP Activity Content format but must manually transform it to Parquet format, limiting generic schema support.

### Requirements

**Must Have**:
- Support batching of any Parquet-based schema
- Backward compatibility with existing DSNP endpoints
- Dynamic schema discovery from blockchain
- Support for non-DSNP schemas (AT Protocol, custom)

**Should Have**:
- Generic validation framework (different issue/PR?)
- Gradual migration path (and/or backwards compatibility)
- Plugin architecture for complex (non-DSNP)schemas
- Comprehensive API documentation on how to use this feature

---

## Current Architecture Analysis

### Batching Flow (Current State)

```
User → REST API Endpoint (/broadcast, /reply, etc.)
  ↓
DTO Validation (BroadcastDto, ReplyDto, etc.)
  ↓
DsnpAnnouncementProcessor
  ↓ (transforms DTO → Announcement)
Queue by Announcement Type (BROADCAST_QUEUE, REPLY_QUEUE, etc.)
  ↓
BatchingProcessorService (groups by queue/schemaId)
  ↓ (Redis Lua scripts: addToBatch)
BatchAnnouncer
  ↓ (fetches schema from chain)
  ↓ (converts DSNP schema → Parquet via fromDSNPSchema)
Parquet File Creation(fromDSNPSchema arg 1)
  ↓
IPFS Pinning(fromDSNPSchema arg 2)
  ↓
On-Chain Announcement
```

## Solution 1: Schema Registry with Dynamic Discovery

### Architecture Overview

Replace hard-coded schema mappings with a dynamic registry that fetches schema metadata from the blockchain at startup and on-demand. This foundation enables any schema (DSNP, AT Protocol, custom) to be used without code changes.

### Core Concept

Instead of maintaining a static map of 20 schemas, the system will:
1. **Query the blockchain** for schema metadata when needed
2. **Cache aggressively** using a three-tier approach (memory → Redis → blockchain)
3. **Auto-detect batchability** based on schema settings
4. **Support any schema** registered on Frequency

### Key Components

#### 1. Schema Registry Service

**Purpose**: Central service for schema metadata management and caching.

**Location**: `libs/blockchain/src/schema-registry.service.ts`

**Key Responsibilities**:
- Fetch schema metadata from blockchain via existing RPC methods (`getSchema`, `getSchemaPayload`)
- Maintain two-way caching: `schemaId ↔ SchemaDefinition` and `schemaName ↔ schemaId`
- Determine if a schema is batchable by inspecting payload location and model type
- Pre-load known DSNP schemas at startup for backward compatibility
- Provide cache invalidation for testing/admin purposes

**Schema Definition Interface**:
```typescript
interface SchemaDefinition {
  schemaId: number;                    // 1-65536
  namespace: string;                    // e.g., "dsnp", "atproto"
  descriptor: string;                   // e.g., "broadcast", "post"
  version: string;                      // e.g., "v2"
  fullName: string;                     // "namespace.descriptor@version"
  payloadLocation: 'IPFS' | 'OnChain'; // Where content is stored
  settings: {
    model: 'Parquet' | 'AvroBinary';   // Batch file format
  };
  batchable: boolean;                   // Auto-detected
  fetchedAt: number;                    // For TTL expiry
}
```

**Caching Strategy** (Three-Tier):
```
Request → In-Memory Map (instant)
            ↓ miss
          Redis Cache (~5ms)
            ↓ miss
          Blockchain RPC (~50ms)
            ↓
          Cache both layers
```

**Batchability Detection Logic**:
- Schema is batchable if: `payloadLocation === 'IPFS'` AND `model === 'Parquet' | 'AvroBinary'`
- All DSNP content schemas are batchable
- On-chain schemas are not batchable (published directly)

**Public API**:
- `getSchema(schemaId): Promise<SchemaDefinition>` - Main lookup method
- `getSchemaIdByName(fullName): Promise<number>` - Reverse lookup
- `isBatchable(schemaId): boolean` - Quick batchability check
- `invalidateSchema(schemaId): Promise<void>` - Admin cache clear

#### 2. Generic Content DTO

**Purpose**: Accept content for any schema without type-specific constraints.

**Location**: `libs/types/src/dtos/content-publishing/generic-content.dto.ts`

**Structure**:
```typescript
GenericContentDto {
  schemaId: number;           // 1-65536, validated
  content: Record<string, any>; // Pre-formatted per schema
  referenceId?: string;       // Optional tracking ID
}

GenericContentResponseDto {
  referenceId: string;        // For tracking
  schemaId: number;           // Confirms schema
  batched: boolean;           // Whether batched or direct
}
```

**Key Point**: Content must be **pre-formatted** to match the target schema's structure. The Gateway does no transformation in Solution 1.

#### 3. Generic API Endpoint

**Location**: `apps/content-publishing-api/src/controllers/v1/content.controller.v1.ts`

**New Endpoint**: `POST /v1/content/:msaId/generic`

**Flow**:
```
1. Receive request with schemaId + content
2. Validate schema exists via SchemaRegistry
3. Check if schema is batchable
4. If batchable → queue for batching (with schema-specific queue name)
5. If not batchable → queue for direct on-chain publishing
6. Return 202 Accepted with reference ID
```

**Example Request (AT Protocol)**:
```json
POST /v1/content/12345/generic
{
  "schemaId": 100,
  "content": {
    "text": "Hello from AT Protocol!",
    "createdAt": "2025-01-15T10:00:00Z",
    "langs": ["en"]
  }
}
```

#### 4. Batching Service Modification

**Change Required**: Extract `schemaId` from announcement instead of hard-coded lookup.

**Current Behavior** (Hard-coded):
```typescript
// Queue name → schema lookup
schemaId = await getSchemaIdByName('dsnp', queueNameMap[queueName])
```

**New Behavior** (Dynamic):
```typescript
// Schema ID embedded in announcement
schemaId = announcement.schemaId || fallbackToLegacyLookup()
```

**Queue Naming**: Generic schemas use pattern `batch:schema:{schemaId}` to avoid conflicts.

### Data Flow Diagram

```
┌─────────────┐
│ User Request│
│ schemaId:100│
└──────┬──────┘
       │
       ▼
┌──────────────────────────┐
│ SchemaRegistry.getSchema │
│ • Check memory cache     │
│ • Check Redis cache      │
│ • Fetch from blockchain  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ SchemaDefinition         │
│ • batchable: true        │
│ • fullName: atproto...   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Route Decision           │
│ if batchable:            │
│   → Batching Queue       │
│ else:                    │
│   → Direct Publish       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Queue: batch:schema:100  │
│ • Group by schema ID     │
│ • Wait for batch trigger │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Batch Announcer          │
│ • Fetch schema (cached)  │
│ • Create Parquet file    │
│ • Pin to IPFS            │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ On-Chain Announcement    │
└──────────────────────────┘
```

### Benefits of Solution 1

1. **Dynamic Schema Support**: Any schema on Frequency can be used without code changes
2. **Backward Compatible**: Existing DSNP endpoints and DTOs continue to work
3. **Performance**: Redis + in-memory caching minimizes blockchain queries (99%+ hit rate expected)
4. **Scalability**: Handles any number of schemas efficiently
5. **Simple**: Low complexity, easy to implement and maintain
6. **Fast**: Ships in 2-4 weeks

### Limitations of Solution 1

1. **No Content Transformation**: Users must pre-format content to match schema exactly
2. **No Schema-Specific Optimization**: All schemas treated uniformly
3. **No Rich Validation**: Only basic schema existence and format validation
4. **User Burden**: Clients must understand schema structure

**Use Case**: Best for users who already have schema-formatted content (e.g., AT Protocol clients that generate native AT Protocol payloads).

---

## Solution 2: Hybrid Architecture

### Architecture Overview

Extend Solution 1 with an **adapter plugin system** that allows schema-specific handling while maintaining generic fallback support.

### Three-Tier Processing Model

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Legacy DSNP Endpoints                               │
│ /broadcast, /reply, /reaction                               │
│ • Existing DTOs and validation                              │
│ • Backward compatible                                       │
│ • Eventually deprecated                                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 2: Adapter-Based Endpoints                            │
│ Uses SchemaAdapterRegistry                                  │
│ • DSNP adapters (rich transformation)                       │
│ • AT Protocol adapters (community)                          │
│ • Custom adapters                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 3: Generic Pass-Through                               │
│ /generic endpoint                                           │
│ • No transformation                                         │
│ • Pre-formatted content required                            │
│ • Fallback for any schema                                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Schema Adapter Interface

**Purpose**: Define pluggable transformation and validation logic per schema.

**Location**: `libs/types/src/interfaces/schema-adapter.interface.ts`

**Core Interface**:
```typescript
interface ISchemaAdapter {
  adapterId: string;
  schemaId: number;
  schemaName: string;
  
  // Can this adapter handle this schema?
  canHandle(schemaId, schemaName): boolean;
  
  // Transform user input → schema format
  transform(input, context): Promise<any>;
  
  // Validate user input
  validate(input): Promise<void>;
  
  // Batch configuration
  getBatchConfig(): BatchConfig;
  
  // Priority for adapter selection (100 = high, 0 = fallback)
  getPriority(): number;
}
```

**Design Philosophy**:
- Each schema can have one or more adapters
- Higher priority adapters are checked first
- Generic adapter (priority 0) is always the fallback
- Adapters can reuse existing transformation logic (e.g., `createBroadcast`)

#### 2. Adapter Registry

**Purpose**: Manage adapter registration and selection.

**Location**: `libs/blockchain/src/schema-adapter.registry.ts`

**Key Responsibilities**:
- Store adapters in priority-ordered lists per schema ID
- Select best adapter using `canHandle()` + priority
- Fall back to generic adapter if no match
- Provide introspection (list all adapters, check if schema has adapter)

**Selection Algorithm**:
```
1. Get candidate adapters for schemaId
2. Sort by priority (descending)
3. For each candidate:
   if canHandle(schemaId, schemaName):
     return adapter
4. Return generic fallback adapter
```

#### 3. DSNP Adapter (Example)

**Purpose**: Transform DSNP Activity Content format → Parquet-ready announcement.

**Key Insight**: Reuses existing `createBroadcast()` logic, just wrapped in adapter interface.

**Example - Broadcast Adapter**:
- **Schema**: `dsnp.broadcast@v2` (ID 17)
- **Priority**: 100 (specific adapter)
- **Transform**: `BroadcastDto` → uses existing `createBroadcast()` helper
- **Validate**: Reuses `BroadcastDto` class-validator decorators
- **Batch Config**: maxSize=1000, maxWaitMs=5000

**Migration Strategy**: Convert existing DSNP processors into adapters incrementally.

#### 4. Generic Pass-Through Adapter

**Purpose**: Handle any schema without transformation.

**Behavior**:
- **Priority**: 0 (lowest - always fallback)
- **Transform**: Pass-through (assumes pre-formatted content)
- **Validate**: Basic object check only
- **canHandle()**: Always returns `true`

**When Used**: For AT Protocol, custom schemas, or any schema without a specific adapter.

#### 5. Unified API Endpoint

**New Endpoint**: `POST /v1/content/:msaId/publish`

**Flow**:
```
1. Receive { schemaId, content }
2. Look up schema via SchemaRegistry
3. Get adapter via AdapterRegistry (specific or generic)
4. adapter.validate(content)
5. transformed = adapter.transform(content, context)
6. batchConfig = adapter.getBatchConfig()
7. Queue with schema-specific config
8. Return 202 Accepted
```

**Example - DSNP Broadcast** (with adapter):
```json
POST /v1/content/12345/publish
{
  "schemaId": 17,
  "content": {
    "content": {
      "published": "2025-01-15T10:00:00Z",
      "content": "Hello DSNP!",
      "tag": ["#test"]
    }
  }
}
```
*Adapter transforms Activity Content → Parquet schema*

**Example - AT Protocol** (without adapter, pass-through):
```json
POST /v1/content/12345/publish
{
  "schemaId": 100,
  "content": {
    "text": "Hello from AT Protocol!",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```
*Generic adapter passes through pre-formatted content*

#### 6. Adapter Registration Module

**Purpose**: Auto-register all adapters at module initialization.

**Pattern**: NestJS module that injects adapters and registers them with registry.

**Adapters to Create**:
- `DsnpBroadcastAdapter` (schema 17)
- `DsnpReplyAdapter` (schema 18)
- `DsnpReactionAdapter` (schema 4)
- `DsnpUpdateAdapter` (schema 19)
- `DsnpProfileAdapter` (schema 6)
- `DsnpTombstoneAdapter` (schema 16)
- `GenericSchemaAdapter` (fallback)

**Community Extension**: Third parties can create adapters for their schemas (e.g., `AtProtoPostAdapter`).

### Data Flow Diagram

```
┌─────────────┐
│User Request │
│schemaId:17  │  (DSNP Broadcast)
└──────┬──────┘
       │
       ▼
┌──────────────────────────┐
│ Adapter Registry         │
│ getAdapter(17)           │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Check Priority-Ordered   │
│ Adapters for Schema 17   │
│ • DsnpBroadcastAdapter   │
│   priority=100 ✓         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ DsnpBroadcastAdapter     │
│ • validate(input)        │
│ • transform(input)       │
│   └─> createBroadcast()  │
│ • getBatchConfig()       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Transformed Content      │
│ (Parquet-ready)          │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Queue for Batching       │
│ (schema-specific config) │
└──────────────────────────┘
```

**vs. AT Protocol (no adapter)**:
```
User Request (schemaId:100)
  → Adapter Registry
  → No specific adapter found
  → GenericSchemaAdapter (priority=0)
  → Pass-through (no transformation)
  → Queue for Batching
```

### Benefits of Solution 2

1. **All Benefits of Solution 1** ✅
2. **Schema-Specific Optimization**: Adapters can implement custom logic, validation, and batch configs per schema
3. **Rich Transformation**: Support for complex REST API → Schema transformations (e.g., Activity Content → Parquet)
4. **Extensibility**: Community can contribute adapters without touching core Gateway code
5. **Gradual Migration**: Three-tier model (Legacy → Adapter → Generic) allows smooth transition with zero breaking changes
6. **Testability**: Each adapter is independently testable in isolation
7. **Documentation**: Adapters self-document their input/output formats
8. **Backward Compatible**: Existing endpoints route through adapter system transparently

### Limitations of Solution 2

1. **Higher Complexity**: More moving parts (registry, adapters, fallback logic)
2. **Longer Timeline**: 6-8 weeks vs. 2-4 weeks for Solution 1
3. **More Testing**: Each adapter needs unit + integration tests
4. **Maintenance**: More code to maintain over time

**Use Case**: Best when you want to support both user-friendly APIs (Activity Content) and generic schemas (AT Protocol), with room for future community extensions.

### Comparison: Solution 1 vs Solution 2

| Aspect | Solution 1 | Solution 2 |
|--------|-----------|-----------|
| **Complexity** | Low (1 service, 1 endpoint) | Medium (registry + adapters) |
| **Flexibility** | Generic only | Generic + Custom adapters |
| **User Experience** | Must pre-format content | Can accept various formats |
| **DSNP Support** | Pass-through | Native (via adapters) |
| **AT Protocol** | ✅ Supported (pre-formatted) | ✅ Supported (with adapter) |
| **Custom Schemas** | ✅ Supported (pre-formatted) | ✅ Supported (with/without adapter) |
| **Backward Compatible** | ✅ Yes | ✅ Yes |
| **Migration Path** | Direct (1 step) | Gradual (3 tiers) |
| **Testing Overhead** | Low | Medium |
| **Community Extensions** | No | ✅ Yes (adapter plugins) |

---

## API Specifications

### OpenAPI Documentation

#### Generic Content Endpoint

```yaml
/v1/content/{msaId}/generic:
  post:
    summary: Publish content for any schema
    description: |
      Generic endpoint for publishing content with any registered schema.
      Content must be pre-formatted according to the target schema's structure.
    
    parameters:
      - name: msaId
        in: path
        required: true
        schema:
          type: string
        description: Message Source Account ID of the publisher
    
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - schemaId
              - content
            properties:
              schemaId:
                type: integer
                minimum: 1
                maximum: 65536
                description: Schema ID for the content
                example: 17
              
              content:
                type: object
                description: Content payload formatted according to schema
                example:
                  fromId: "12345"
                  contentHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
                  url: "https://example.com/content"
                  announcementType: 1
              
              referenceId:
                type: string
                description: Optional reference ID for tracking
                example: "my-ref-123"
          
          examples:
            atprotocol-post:
              summary: AT Protocol Post
              value:
                schemaId: 100
                content:
                  text: "Hello from AT Protocol!"
                  createdAt: "2025-01-15T10:00:00Z"
                  langs: ["en"]
            
            custom-schema:
              summary: Custom Schema
              value:
                schemaId: 200
                content:
                  customField1: "value1"
                  customField2: 42
    
    responses:
      '202':
        description: Content accepted for publishing
        content:
          application/json:
            schema:
              type: object
              properties:
                referenceId:
                  type: string
                  description: Reference ID for tracking
                schemaId:
                  type: integer
                  description: Schema ID of the content
                batched:
                  type: boolean
                  description: Whether content will be batched
            example:
              referenceId: "abc123def456"
              schemaId: 17
              batched: true
      
      '400':
        description: Invalid schema ID or content format
      
      '404':
        description: Schema not found
      
      '401':
        description: Unauthorized (delegation required)
```

#### Unified Publish Endpoint (Solution 2)

```yaml
/v1/content/{msaId}/publish:
  post:
    summary: Publish content for any schema (Recommended)
    description: |
      Unified endpoint supporting automatic transformation via adapters.
      
      Supports:
      - DSNP schemas with automatic transformation from Activity Content format
      - AT Protocol schemas (with adapter)
      - Custom schemas (pre-formatted or with custom adapter)
      
      The system automatically:
      1. Looks up schema metadata from blockchain
      2. Finds best matching adapter (or uses generic)
      3. Transforms and validates content
      4. Queues for batching or direct publishing
    
    parameters:
      - name: msaId
        in: path
        required: true
        schema:
          type: string
    
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - schemaId
              - content
            properties:
              schemaId:
                type: integer
                minimum: 1
                maximum: 65536
              content:
                type: object
                description: |
                  Content in adapter-specific format:
                  - For DSNP: Activity Content format
                  - For AT Protocol: Native AT Protocol format
                  - For generic: Pre-formatted schema structure
          
          examples:
            dsnp-broadcast:
              summary: DSNP Broadcast (auto-transformed)
              value:
                schemaId: 17
                content:
                  content:
                    published: "2025-01-15T10:00:00Z"
                    content: "Hello DSNP!"
                    tag: ["#test"]
            
            atprotocol-post:
              summary: AT Protocol Post (via adapter)
              value:
                schemaId: 100
                content:
                  text: "Hello from AT Protocol!"
                  createdAt: "2025-01-15T10:00:00Z"
    
    responses:
      '202':
        description: Content accepted
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenericContentResponse'
```

### Schema Introspection Endpoints

```yaml
/v1/schemas:
  get:
    summary: List all registered schemas
    description: Returns schemas cached in the registry
    parameters:
      - name: batchable
        in: query
        schema:
          type: boolean
        description: Filter by batchable schemas only
    
    responses:
      '200':
        description: List of schemas
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/SchemaDefinition'

/v1/schemas/{schemaId}:
  get:
    summary: Get schema metadata
    parameters:
      - name: schemaId
        in: path
        required: true
        schema:
          type: integer
    
    responses:
      '200':
        description: Schema metadata
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SchemaDefinition'
            example:
              schemaId: 17
              namespace: "dsnp"
              descriptor: "broadcast"
              version: "v2"
              fullName: "dsnp.broadcast@v2"
              payloadLocation: "IPFS"
              settings:
                model: "Parquet"
              batchable: true
              cached: true
              fetchedAt: 1705315200000
      
      '404':
        description: Schema not found

/v1/schemas/by-name/{schemaName}:
  get:
    summary: Get schema by name
    parameters:
      - name: schemaName
        in: path
        required: true
        schema:
          type: string
        example: "dsnp.broadcast@v2"
    
    responses:
      '200':
        description: Schema metadata
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SchemaDefinition'
```

---

## Recommendation

**Implement Solution 2 (Hybrid Architecture) in phases:**

### Phase 1 (Weeks 1-4): Solution 1 Core
- Ship Schema Registry + Generic Endpoint
- Enables AT Protocol schemas immediately
- Low risk, high value

### Phase 2 (Weeks 5-8): Solution 2 Adapters
- Add adapter framework
- Migrate DSNP schemas to adapters
- Prepare for community extensions

### Why This Approach?

1. **Quick Win**: AT Protocol support in 2 weeks
2. **Low Risk**: Gradual rollout with backward compatibility
3. **Future-Proof**: Adapter system enables community growth
4. **Practical**: Balance between simplicity and flexibility

### Success Criteria

- ✅ AT Protocol schemas can be batched on testnet
- ✅ Zero regressions in existing DSNP functionality
- ✅ 90%+ test coverage
- ✅ Performance: < 5% overhead vs current system
- ✅ Documentation complete for both users and adapter developers

---

## Appendix A: Code Examples

### Example: Publishing AT Protocol Post

```typescript
// Using generic endpoint (Solution 1)
const response = await fetch('/v1/content/12345/generic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    schemaId: 100, // AT Protocol post schema
    content: {
      text: "Hello from AT Protocol!",
      createdAt: new Date().toISOString(),
      langs: ["en"],
      facets: [],
      reply: null,
      embed: null,
    },
  }),
});

console.log(await response.json());
// { referenceId: "abc123", schemaId: 100, batched: true }
```

### Example: Creating Custom Adapter

```typescript
// custom-schema.adapter.ts
import { Injectable } from '@nestjs/common';
import { ISchemaAdapter, TransformContext, BatchConfig } from '#types';

@Injectable()
export class MyCustomSchemaAdapter implements ISchemaAdapter {
  readonly adapterId = 'my-custom-schema-v1';
  readonly schemaId = 200; // Your schema ID
  readonly schemaName = 'myapp.custom@v1';

  canHandle(schemaId: number): boolean {
    return schemaId === this.schemaId;
  }

  async transform(input: any, context: TransformContext): Promise<any> {
    // Transform from your API format to schema format
    return {
      userId: context.msaId,
      timestamp: Date.now(),
      customData: input.myField,
    };
  }

  async validate(input: any): Promise<void> {
    if (!input.myField) {
      throw new Error('myField is required');
    }
  }

  getBatchConfig(): BatchConfig {
    return {
      maxSize: 500,
      maxWaitMs: 10000,
    };
  }

  getPriority(): number {
    return 100;
  }
}

// Register in module
@Module({
  providers: [MyCustomSchemaAdapter],
})
export class MyAdaptersModule {
  constructor(
    private registry: SchemaAdapterRegistry,
    private adapter: MyCustomSchemaAdapter,
  ) {
    this.registry.register(this.adapter);
  }
}
```

---

## Appendix B: References

- [Issue #731](https://github.com/ProjectLibertyLabs/gateway/issues/731)
- [DSNP Schema Processing Lesson](../docs/src/Learn/DSNPSchemaProcessing.md)
- [Frequency Schema Pallet Documentation](https://docs.frequency.xyz/pallets/schemas)
- [AT Protocol Schemas](https://atproto.com/specs/lexicon)
- [Apache Parquet Format](https://parquet.apache.org/docs/)

---

**End of Proposal**

---

## Review Checklist

Before approving this proposal, reviewers should verify:

- [ ] Technical approach is sound
- [ ] Backward compatibility maintained
- [ ] Test coverage adequate
- [ ] Documentation plan sufficient
- [ ] Timeline realistic
- [ ] Risks identified and mitigated
- [ ] Open questions addressed

**Reviewers**: Please add comments and approve when ready.

