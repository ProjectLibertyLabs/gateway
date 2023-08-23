import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('exampleQueue', {
  concurrency: 2,
})
export class ExampleConsumer extends WorkerHost {
  // eslint-disable-next-line class-methods-use-this
  async process(job: Job): Promise<any> {
    console.log(job.data);
  }

  // eslint-disable-next-line class-methods-use-this
  @OnWorkerEvent('completed')
  onCompleted() {
    // do some stuff
  }
}
