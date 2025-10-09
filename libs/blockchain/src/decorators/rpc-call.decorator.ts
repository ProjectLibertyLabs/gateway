/**
 * Decorator that wraps RPC method calls with error handling and logging.
 * Automatically logs the RPC method name when errors occur and enhances error messages.
 * 
 * @param rpcMethodName - The name of the RPC method being called (e.g., 'rpc.chain.getBlockHash')
 * 
 * @example
 * ```typescript
 * @RpcCall('rpc.chain.getBlockHash')
 * public getBlockHash(block: BlockNumber | AnyNumber): Promise<BlockHash> {
 *   return this.api.rpc.chain.getBlockHash(block);
 * }
 * ```
 */
export function RpcCall(rpcMethodName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        // Log the error with RPC method context
        if (this.logger) {
          this.logger.error(`RPC call failed: ${rpcMethodName}`, error?.message || error);
        }

        // Enhance the error message with RPC method name
        if (error instanceof Error) {
          error.message = `[${rpcMethodName}] ${error.message}`;
        }

        throw error;
      }
    };

    return descriptor;
  };
}

