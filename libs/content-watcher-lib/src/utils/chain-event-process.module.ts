import { Module } from '@nestjs/common';
import { ChainEventProcessorService } from './chain-event-processor.service';

@Module({
  imports: [],
  providers: [ChainEventProcessorService],
  exports: [ChainEventProcessorService],
})
export class ChainEventProcessorModule {}
