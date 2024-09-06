import { DynamicModule, Global, Module } from '@nestjs/common';
import { CacheMonitorService } from './cache-monitor.service';
import { RedisClientOptions, RedisModule } from '@songkeys/nestjs-redis';

@Global()
@Module({})
export class CacheModule {
  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<RedisClientOptions | RedisClientOptions[]> | RedisClientOptions | RedisClientOptions[];
    inject?: unknown[];
  }): DynamicModule {
    return {
      global: true,
      module: CacheModule,
      imports: [
        RedisModule.forRootAsync(
          {
            imports: [CacheModule],
            inject: [CacheMonitorService, ...(options.inject || [])],
            useFactory: async (cacheMonitor: CacheMonitorService, ...args: unknown[]) => {
              const clientOptions = await options.useFactory(...args);
              return {
                config: (Array.isArray(clientOptions) ? clientOptions : [clientOptions]).map((option) => ({
                  ...option,
                  onClientCreated: (client) => cacheMonitor.registerRedisClient(client, option.namespace || 'default'),
                })),
                readyLog: false,
                errorLog: false,
              };
            },
          },
          true, // isGlobal
        ),
      ],
      providers: [CacheMonitorService],
      exports: [CacheMonitorService],
    };
  }
}
