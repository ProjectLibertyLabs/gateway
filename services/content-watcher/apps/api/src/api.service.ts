import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IRequestJob } from '../../../libs/common/src';
import { ScannerService } from '../../../libs/common/src/scanner/scanner.service';
import { LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY } from '../../../libs/common/src/constants';

@Injectable()
export class ApiService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    private readonly scannerService: ScannerService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  public setLastSeenBlockNumber(blockNumber: bigint) {
    return this.redis.set(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, blockNumber.toString());
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
