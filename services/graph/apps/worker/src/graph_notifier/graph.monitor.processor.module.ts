import { BlockchainModule, GraphStateManager } from '#lib';
import { Module } from '@nestjs/common';
import { GraphMonitorService } from './graph.monitor.service';
import { CapacityCheckerService } from '#lib/blockchain/capacity-checker.service';

@Module({
  imports: [BlockchainModule],
  providers: [GraphMonitorService, GraphStateManager, CapacityCheckerService],
  exports: [],
})
export class GraphNotifierModule {}
