import { Module } from '@nestjs/common';
import { GraphMonitorService } from './graph.monitor.service';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';

@Module({
  imports: [BlockchainModule],
  providers: [GraphMonitorService, GraphStateManager],
  exports: [],
})
export class GraphNotifierModule {}
