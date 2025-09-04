import { CommonConsumer } from '#types/constants/queue.constants';
import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { OnModuleDestroy } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { delayMS } from '#utils/common/common.utils';
import { PinoLogger } from 'nestjs-pino';

export abstract class BaseConsumer<T extends Worker = Worker> extends WorkerHost<T> implements OnModuleDestroy {
  private actives: Set<string>;

  protected constructor(protected logger: PinoLogger) {
    super();
    this.logger.setContext(this.constructor.name);
    this.actives = new Set();
  }

  trackJob(jobId: string) {
    this.actives.add(jobId);
  }

  unTrackJob(jobId: string) {
    this.actives.delete(jobId);
  }

  async onModuleDestroy(): Promise<any> {
    await this.worker?.close(false);
    let maxWaitMs = CommonConsumer.MAX_WAIT_FOR_GRACE_FULL_SHUTDOWN_MS;
    while (this.actives.size > 0 && maxWaitMs > 0) {
      await delayMS(CommonConsumer.DELAY_TO_CHECK_FOR_SHUTDOWN_MS);
      maxWaitMs -= CommonConsumer.DELAY_TO_CHECK_FOR_SHUTDOWN_MS;
    }
  }

  /**
   * any method overriding this method should call this method directly, so we are able to track the executing jobs
   */
  @OnWorkerEvent('active')
  onActive(job: Job<any, any, string>) {
    this.trackJob(job.id!);
  }

  /**
   * any method overriding this method should call this method directly, so we are able to track the executing jobs
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job<any, any, string>) {
    this.unTrackJob(job.id!);
  }

  /**
   * any method overriding this method should call this method directly, so we are able to track the executing jobs
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<any, any, string>) {
    this.unTrackJob(job.id!);
  }
}
