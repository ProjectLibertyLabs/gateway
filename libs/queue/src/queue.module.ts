import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import cacheConfig, { ICacheConfig } from '#cache/cache.config';
import { IQueueModuleOptions } from './queue.interfaces';
import { CONFIGURED_QUEUE_NAMES_PROVIDER, CONFIGURED_QUEUE_PREFIX_PROVIDER } from '#types/constants';

function getPrefix(options: IQueueModuleOptions, cacheConf: ICacheConfig) {
  return options?.config?.prefix || `${cacheConf.cacheKeyPrefix}:bull`;
}

@Module({})
export class QueueModule {
  static forRoot(options: IQueueModuleOptions): DynamicModule {
    const queueNamesProvider: Provider = {
      provide: CONFIGURED_QUEUE_NAMES_PROVIDER,
      useValue: options.queues.map(({ name }) => name),
    };

    const queuePrefixProvider: Provider = {
      provide: CONFIGURED_QUEUE_PREFIX_PROVIDER,
      useFactory: (cacheConf: ICacheConfig) => getPrefix(options, cacheConf),
      inject: [cacheConfig.KEY],
    };

    const imports = [
      BullModule.forRootAsync({
        useFactory: (cacheConf: ICacheConfig) => ({
          ...options?.config,
          connection: options?.config?.connection || cacheConf.redisOptions,
          prefix: getPrefix(options, cacheConf),
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
      providers: [queueNamesProvider, queuePrefixProvider],
      exports: [BullModule, queuePrefixProvider, queueNamesProvider],
    };
  }
}
