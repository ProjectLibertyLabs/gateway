import { PinoLogger } from 'nestjs-pino';

/**
 * Decorator that wraps RPC method calls with error handling and logging.
 * Automatically logs the RPC method name, arguments, and error details when errors occur.
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
        const logger: PinoLogger | undefined = this.logger;
        if (logger && typeof logger.error === 'function') {
          // Simple argument serialization
          const serializedArgs = args.map((arg) => {
            try {
              // Handle primitive types directly
              if (arg === null || arg === undefined || typeof arg !== 'object') {
                return arg;
              }
              
              // Handle blockchain types with common methods
              if (arg.toHex && typeof arg.toHex === 'function') {
                return arg.toHex();
              }
              if (arg.toNumber && typeof arg.toNumber === 'function') {
                return arg.toNumber();
              }
              if (arg.toString && typeof arg.toString === 'function') {
                return arg.toString();
              }
              
              // For other objects, use JSON.stringify with error handling
              return JSON.stringify(arg);
            } catch {
              return '[Unserializable]';
            }
          });

          logger.error(
            {
              rpcMethod: rpcMethodName,
              rpcArgs: serializedArgs,
              errorMessage: error?.message,
              errorName: error?.name,
            },
            `RPC call failed: ${rpcMethodName}`,
          );
        }

        // Add error message with RPC method name if there is an Error object
        if (error instanceof Error) {
          error.message = `[${rpcMethodName}] ${error.message}`;
        }

        throw error;
      }
    };

    return descriptor;
  };
}

