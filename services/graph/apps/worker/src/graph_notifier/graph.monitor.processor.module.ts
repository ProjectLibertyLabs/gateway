import { BlockchainModule, BlockchainService, ConfigModule, ConfigService, GraphStateManager } from '#lib';
import { Module } from '@nestjs/common';
import { RedisModule } from '@songkeys/nestjs-redis';
import { GraphNotifierService } from './graph.monitor.processor.service';

@Module({
  imports: [
    BlockchainModule,
    RedisModule.forRootAsync(
      {
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          config: [{ url: configService.redisUrl.toString() }],
        }),
        inject: [ConfigService],
      },
      true, // isGlobal
    ),
  ],
  providers: [GraphNotifierService, GraphStateManager],
  exports: [GraphNotifierService],
})
export class GraphNotifierModule {}
