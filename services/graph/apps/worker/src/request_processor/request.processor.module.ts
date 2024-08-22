import { Module } from '@nestjs/common';
import { RequestProcessorService } from './request.processor.service';
import { BlockchainModule } from '#lib/blockchain';
import { GraphStateManager } from '#lib/services/graph-state-manager';

@Module({
  imports: [BlockchainModule],
  providers: [RequestProcessorService, GraphStateManager],
  exports: [RequestProcessorService],
})
export class RequestProcessorModule {}
