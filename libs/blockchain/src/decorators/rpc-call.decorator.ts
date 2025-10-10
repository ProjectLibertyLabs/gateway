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
          // Safely serialize arguments, handling circular references and large objects
          const serializedArgs = args.map((arg, index) => {
            try {
              // Handle common blockchain types
              if (arg && typeof arg === 'object') {
                if (arg.toHex && typeof arg.toHex === 'function') {
                  return { type: 'HexString', value: arg.toHex() };
                }
                if (arg.toNumber && typeof arg.toNumber === 'function') {
                  return { type: 'Number', value: arg.toNumber() };
                }
                if (arg.toString && typeof arg.toString === 'function' && arg.constructor.name !== 'Object') {
                  return { type: arg.constructor.name, value: arg.toString() };
                }
                // For plain objects, limit depth and size
                return JSON.parse(JSON.stringify(arg, (key, value) => {
                  if (typeof value === 'object' && value !== null) {
                    if (value.toHex && typeof value.toHex === 'function') {
                      return { type: 'HexString', value: value.toHex() };
                    }
                    if (value.toNumber && typeof value.toNumber === 'function') {
                      return { type: 'Number', value: value.toNumber() };
                    }
                  }
                  return value;
                }));
              }
              return arg;
            } catch (serializationError) {
              return { type: 'SerializationError', message: 'Could not serialize argument' };
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

