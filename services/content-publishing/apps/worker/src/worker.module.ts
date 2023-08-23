import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WorkerService } from './worker.service';
import { ExampleConsumer } from './consumer';
import { ExampleQueueEvents } from './event.listener';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
        enableOfflineQueue: false,
      },
    }),
    BullModule.registerQueue({
      name: 'testQueue',
    }),
  ],
  providers: [WorkerService, ExampleConsumer, ExampleQueueEvents],
})
export class WorkerModule {}
