import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import queueConfig, { IQueueConfig } from './queue.config';
import { IQueueModuleOptions } from './queue.interfaces';

@Module({})
export class QueueModule {
  static forRoot(options: IQueueModuleOptions): DynamicModule {
    const imports = [
      BullModule.forRootAsync({
        useFactory: (queueConf: IQueueConfig) => ({
          ...options?.config,
          connection: options?.config?.connection || queueConf.redisConnectionOptions,
          prefix: options?.config?.prefix || `${queueConf.cacheKeyPrefix}:bull`,
        }),
        inject: [queueConfig.KEY],
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
