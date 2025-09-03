import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { BatchingProcessorService } from './batching.processor.service';
import { BroadcastWorker, ReplyWorker, ReactionWorker, TombstoneWorker, UpdateWorker, ProfileWorker } from './workers';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.PRETTY === 'true' ? { target: 'pino-pretty' } : undefined,
      },
    }),
  ],
  providers: [
    BatchingProcessorService,
    BroadcastWorker,
    ReplyWorker,
    ReactionWorker,
    TombstoneWorker,
    UpdateWorker,
    ProfileWorker,
  ],
  exports: [BatchingProcessorService],
})
export class BatchingProcessorModule {}
