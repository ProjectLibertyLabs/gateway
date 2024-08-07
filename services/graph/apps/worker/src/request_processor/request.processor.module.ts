import { Module } from '@nestjs/common';
import { BlockchainModule, GraphStateManager } from '#lib';
import { RequestProcessorService } from './request.processor.service';

@Module({
  imports: [BlockchainModule],
  providers: [RequestProcessorService, GraphStateManager],
  exports: [RequestProcessorService],
})
export class RequestProcessorModule {}
