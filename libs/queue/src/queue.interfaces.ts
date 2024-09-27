import { RegisterQueueOptions } from '@nestjs/bullmq';
import { QueueOptions } from 'bullmq';

export interface IQueueModuleOptions {
  config?: QueueOptions;
  enableUI?: boolean;
  uiRoute?: string;
  queues: RegisterQueueOptions[];
}
