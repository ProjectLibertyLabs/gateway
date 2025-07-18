import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import { IQueueModuleOptions } from './queue.interfaces';

@Module({})
export class QueueModule {
  static forRoot(options: IQueueModuleOptions): DynamicModule {
    const imports = [
      BullModule.forRootAsync({
        useFactory: (cacheConf: ICacheConfig) => ({
          ...options?.config,
          connection: options?.config?.connection || cacheConf.redisOptions,
          prefix: options?.config?.prefix || `${cacheConf.cacheKeyPrefix}:bull`,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        }),
        inject: [cacheConfig.KEY],
      }),
      BullModule.registerQueue(...options.queues),
    ];
    if (options?.enableUI) {
      imports.push(
        BullBoardModule.forRoot({
          route: options?.uiRoute || '/queues',
          adapter: ExpressAdapter,
        }),
      );
      imports.push(
        ...options.queues.map(({ name }) =>
          BullBoardModule.forFeature({
            name,
            adapter: BullMQAdapter,
          }),
        ),
      );
    }

    return {
      global: true,
      module: QueueModule,
      imports,
      exports: [BullModule],
    };
  }
}
