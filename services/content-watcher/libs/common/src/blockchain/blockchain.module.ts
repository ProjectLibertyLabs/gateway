/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ConfigModule } from '../config/config.module';
import { ChainEventProcessorService } from './chain-event-processor.service';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [BlockchainService, ChainEventProcessorService],
  exports: [BlockchainService, ChainEventProcessorService],
})
export class BlockchainModule {}
