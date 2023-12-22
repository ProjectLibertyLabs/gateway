import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class AsyncDebouncerService {
  private readonly logger: Logger;

  constructor(@InjectRedis() private redis: Redis) {
    this.logger = new Logger(this.constructor.name);
  }

  async debounceAsyncOperation<T>(key: string, asyncOperation: () => Promise<T>, debounceTime: number): Promise<T | null> {
    const cacheKey = this.getCacheKey(key);

    const cachedFuture = await this.redis.get(cacheKey);
    if (cachedFuture) {
      this.logger.debug(`Async operation for key ${key} is already inflight`);
      return JSON.parse(cachedFuture);
    }

    const promise = asyncOperation();

    await this.redis.setex(cacheKey, debounceTime, JSON.stringify(promise));

    promise.finally(() => {
      this.redis.del(cacheKey);
    });

    return promise;
  }

  private getCacheKey(key: string): string {
    this.logger.debug(`Async operation for key ${key} is not inflight`);
    return `inflight-future:${key}`;
  }
}
