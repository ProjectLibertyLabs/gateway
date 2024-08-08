import { BlockchainModule, ConfigModule, ConfigService, GraphStateManager } from '#lib';
import { Module } from '@nestjs/common';
import { RedisModule } from '@songkeys/nestjs-redis';
import { GraphMonitorService } from './graph.monitor.service';
import { CapacityCheckerService } from '#lib/blockchain/capacity-checker.service';

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
  providers: [GraphMonitorService, GraphStateManager, CapacityCheckerService],
  exports: [],
})
export class GraphNotifierModule {}
