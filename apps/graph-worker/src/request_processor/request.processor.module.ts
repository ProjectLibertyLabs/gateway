import { Module } from '@nestjs/common';
import { RequestProcessorService } from './request.processor.service';
import { GraphStateManager } from '#graph-lib/services/graph-state-manager';
import { BlockchainModule } from '#blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  providers: [RequestProcessorService, GraphStateManager],
  exports: [RequestProcessorService],
})
export class RequestProcessorModule {}
