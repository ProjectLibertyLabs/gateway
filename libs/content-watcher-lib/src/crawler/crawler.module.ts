import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerService } from './crawler.service';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { ChainEventProcessorModule } from '#content-watcher-lib/utils/chain-event-process.module';

@Module({
  imports: [ScheduleModule, ChainEventProcessorModule],
  controllers: [],
  providers: [CrawlerService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
