import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ChainEventProcessorService } from './chain-event-processor.service';

@Module({
  imports: [],
  controllers: [],
  providers: [BlockchainService, ChainEventProcessorService],
  exports: [BlockchainService, ChainEventProcessorService],
})
export class BlockchainModule {}
