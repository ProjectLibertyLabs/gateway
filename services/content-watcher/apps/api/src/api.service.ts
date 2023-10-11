import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { BulkJobOptions } from 'bullmq/dist/esm/interfaces';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';
import {
  AnnouncementResponseDto,
  AnnouncementTypeDto,
  AssetIncludedRequestDto,
  IRequestJob,
  isImage,
  QueueConstants,
  RequestTypeDto,
  UploadResponseDto,
} from '../../../libs/common/src';
import { calculateIpfsCID } from '../../../libs/common/src/utils/ipfs';
import { IAssetJob, IAssetMetadata } from '../../../libs/common/src/interfaces/asset-job.interface';
import { RedisUtils } from '../../../libs/common/src/utils/redis';

@Injectable()
export class ApiService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue,
    @InjectQueue(QueueConstants.ASSET_QUEUE_NAME) private assetQueue: Queue,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: IRequestJob): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  private checkTransactionResult(result: [error: Error | null, result: unknown][] | null) {
    this.logger.log(result);
    for (let index = 0; result && index < result.length; index += 1) {
      const [err, _id] = result[index];
      if (err) {
        throw err;
      }
    }
  }
}
