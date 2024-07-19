import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  onApplicationShutdown(signal?: string | undefined) {
    try {
      this.logger.log('Cleanup on shutdown completed.');
    } catch (e) {
      this.logger.error(`Error during cleanup on shutdown: ${e}`);
    }
  }

  // async watchGraphs(watchGraphsDto: WatchGraphsDto): Promise<void> {
  //   watchGraphsDto.msaIds.forEach(async (msaId) => {
  //     const redisKey = `${QueueConstants.REDIS_WATCHER_PREFIX}:${msaId}`;
  //     const redisValue = watchGraphsDto.webhookEndpoint;
  //     // eslint-disable-next-line no-await-in-loop
  //     await this.redis.rpush(redisKey, redisValue);
  //   });
  // }
}
