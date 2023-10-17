import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ContentSearchRequestDto } from '../../../libs/common/src';
import { ScannerService } from '../../../libs/common/src/scanner/scanner.service';
import { EVENTS_TO_WATCH_KEY, LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY } from '../../../libs/common/src/constants';
import { IChainWatchOptionsDto } from '../../../libs/common/src/dtos/chain.watch.dto';

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
    this.logger.warn(`Setting last seen block number to ${blockNumber}`);
    return this.redis.set(LAST_SEEN_BLOCK_NUMBER_SCANNER_KEY, blockNumber.toString());
  }

  public async setWatchOptions(watchOptions: IChainWatchOptionsDto) {
    this.logger.warn(`Setting watch options to ${JSON.stringify(watchOptions)}`);
    const currentWatchOptions = await this.redis.get(EVENTS_TO_WATCH_KEY);
    this.logger.warn(`Current watch options are ${currentWatchOptions}`);
    await this.redis.set(EVENTS_TO_WATCH_KEY, JSON.stringify(watchOptions));
  }

  public pauseScanner() {
    this.logger.warn('Pausing scanner');
    return this.scannerService.pauseScanner();
  }

  public resumeScanner() {
    this.logger.warn('Resuming scanner');
    return this.scannerService.resumeScanner();
  }

  public async searchContent(contentSearchRequestDto: ContentSearchRequestDto) {
    this.logger.debug(`Searching for content with request ${JSON.stringify(contentSearchRequestDto)}`);
  }
  
  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: ContentSearchRequestDto): string {
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
