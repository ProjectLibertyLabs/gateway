# @RpcCall Decorator - Structured Logging with PinoLogger

## Usage

```typescript
import { RpcCall } from './decorators/rpc-call.decorator';

export class BlockchainRpcQueryService {
  constructor(protected readonly logger: PinoLogger) {}

  @RpcCall('rpc.chain.getBlockHash')
  public getBlockHash(block: BlockNumber | AnyNumber): Promise<BlockHash> {
    return this.api.rpc.chain.getBlockHash(block);
  }
}
```

## Log Output

### Before (Simple String Logging)
```json
{
  "level": "error",
  "msg": "RPC call failed: rpc.chain.getBlockHash Connection timeout"
}
```

### After (Structured Logging with PinoLogger)
```json
{
  "level": "error",
  "rpcMethod": "rpc.chain.getBlockHash",
  "errorMessage": "Connection timeout",
  "errorName": "Error",
  "msg": "RPC call failed: rpc.chain.getBlockHash"
}
```

## Benefits

1. **Structured Data**: Error details are in separate fields, not concatenated strings
2. **Queryable**: Can easily filter logs by `rpcMethod` or `errorName`
3. **Parseable**: Log aggregation tools (ELK, Datadog, etc.) can index fields
4. **Consistent**: Follows Pino's best practices for structured logging
5. **Type-Safe**: PinoLogger provides TypeScript type checking

## Example Queries in Log Aggregation

```javascript
// Find all RPC failures for a specific method
rpcMethod:"rpc.chain.getBlockHash"

// Find all timeout errors
errorMessage:*timeout*

// Find all RPC errors by error type
errorName:"TimeoutError"

// Combine filters
rpcMethod:"rpc.msa.*" AND errorName:"Error"
```

## Error Enhancement

The decorator also enhances the error message for better stack traces:

```typescript
// Original error: "Connection timeout"
// Enhanced error: "[rpc.chain.getBlockHash] Connection timeout"
```

This makes it easy to identify which RPC call failed when looking at error stack traces.

