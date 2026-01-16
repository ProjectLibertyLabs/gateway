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
        // await value vs. just returning the Promise so that rejections are thrown & caught here
        const retval = await originalMethod.apply(this, args);
        return retval;
      } catch (error: any) {
        const logger: PinoLogger | undefined = this.logger;
        if (logger && typeof logger.error === 'function') {
          // Convert blockchain SCALE encoded types, let Pino handle the rest
          const serializedArgs = args.map((arg) => {
            if (arg?.toHex) return arg.toHex();
            if (arg?.toNumber) return arg.toNumber();
            return arg;
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
