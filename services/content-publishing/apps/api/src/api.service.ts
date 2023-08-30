import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { AnnouncementResponseDto, AnnouncementTypeDto, IRequestJob, QueueConstants, RequestTypeDto } from '../../../libs/common/src';

@Injectable()
export class ApiService {
  private readonly logger: Logger;

  constructor(@InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue) {
    this.logger = new Logger(this.constructor.name);
  }

  async enqueueRequest(announcementType: AnnouncementTypeDto, dsnpUserId: string, content?: RequestTypeDto, targetContentHash?: string): Promise<AnnouncementResponseDto> {
    const data = {
      content,
      id: '',
      announcementType,
      dsnpUserId,
      targetContentHash,
    } as IRequestJob;
    data.id = this.calculateJobId(data);
    const job = await this.requestQueue.add(`Request Job - ${data.id}`, data, { jobId: data.id, removeOnFail: false, removeOnComplete: 2000 }); // TODO: should come from config
    this.logger.debug(job);
    return {
      referenceId: data.id,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  calculateJobId(jobWithoutId: IRequestJob): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }
}
