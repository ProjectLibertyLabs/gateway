import { BlockchainModule } from '#blockchain/blockchain.module';
import { Module } from '@nestjs/common';
import { ChainEventProcessorService } from './chain-event-processor.service';

@Module({
  imports: [BlockchainModule],
  providers: [ChainEventProcessorService],
  exports: [ChainEventProcessorService],
})
export class ChainEventProcessorModule {}
