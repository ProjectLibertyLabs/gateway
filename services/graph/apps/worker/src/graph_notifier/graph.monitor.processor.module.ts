import { Module } from '@nestjs/common';
import { GraphMonitorService } from './graph.monitor.service';
import { CapacityCheckerService } from '#lib/blockchain/capacity-checker.service';
import { BlockchainModule } from '#lib/blockchain';
import { GraphStateManager } from '#lib/services/graph-state-manager';

@Module({
  imports: [BlockchainModule],
  providers: [GraphMonitorService, GraphStateManager, CapacityCheckerService],
  exports: [],
})
export class GraphNotifierModule {}
