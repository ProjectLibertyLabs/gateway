/*
This is a controller providing some endpoints useful for development and testing.
To use it, simply rename and remove the '.dev' extension
*/

// eslint-disable-next-line max-classes-per-file
import { Controller, Logger, Post, Body, Param, Query, HttpException, HttpStatus, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueConstants } from '../../../libs/common/src';

@Controller('api/dev')
export class DevelopmentController {
  private readonly logger: Logger;

  constructor(@InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get('/request/:jobId')
  async requestJob(@Param('jobId') jobId: string) {
    this.logger.log(jobId);
    const job = await this.requestQueue.getJob(jobId);
    this.logger.log(job);
    return job;
  }
}
