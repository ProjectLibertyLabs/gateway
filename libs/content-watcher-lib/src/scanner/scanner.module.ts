import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScannerService } from './scanner.service';
import { ChainEventProcessorModule } from '#content-watcher-lib/utils/chain-event-process.module';

@Module({
  imports: [ScheduleModule, ChainEventProcessorModule],
  controllers: [],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
