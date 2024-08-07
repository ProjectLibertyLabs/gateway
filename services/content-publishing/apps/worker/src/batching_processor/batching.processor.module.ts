import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BatchingProcessorService } from './batching.processor.service';
import { BroadcastWorker, ReplyWorker, ReactionWorker, TombstoneWorker, UpdateWorker, ProfileWorker } from './workers';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [BatchingProcessorService, BroadcastWorker, ReplyWorker, ReactionWorker, TombstoneWorker, UpdateWorker, ProfileWorker],
  exports: [BatchingProcessorService],
})
export class BatchingProcessorModule {}
