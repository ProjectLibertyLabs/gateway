import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueConstants } from '../../../../libs/common/src';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';

@Injectable()
export class ApiService implements OnApplicationShutdown {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  onApplicationShutdown(signal?: string | undefined) {
    try {
      this.redis.del(QueueConstants.REDIS_WATCHER_PREFIX);
      this.redis.del(QueueConstants.DEBOUNCER_CACHE_KEY);
      this.redis.del(QueueConstants.LAST_PROCESSED_DSNP_ID_KEY);
      this.logger.log('Cleanup on shutdown completed.');
    } catch (e) {
      this.logger.error(`Error during cleanup on shutdown: ${e}`);
    }
  }

  // async enqueueRequest(request: ProviderGraphDto): Promise<AccountChangeRepsonseDto> {
  //   const providerId = this.configService.getProviderId();
  //   const data: ProviderGraphUpdateJob = {
  //     msaId: request.msaId,
  //     providerId,
  //     connections: request.connections.data,
  //     graphKeyPairs: request.graphKeyPairs,
  //     referenceId: this.calculateJobId(request),
  //     updateConnection: this.configService.getReconnectionServiceRequired(),
  //   };
  //   const jobOld = await this.accountChangeRequestQueue.getJob(data.referenceId);
  //   if (jobOld && (await jobOld.isCompleted())) {
  //     await jobOld.remove();
  //   }
  //   const job = await this.accountChangeRequestQueue.add(`Request Job - ${data.referenceId}`, data, { jobId: data.referenceId });
  //   this.logger.debug(job);
  //   return {
  //     referenceId: data.referenceId,
  //   };
  // }

  // async watchGraphs(watchGraphsDto: WatchGraphsDto): Promise<void> {
  //   watchGraphsDto.msaIds.forEach(async (msaId) => {
  //     const redisKey = `${QueueConstants.REDIS_WATCHER_PREFIX}:${msaId}`;
  //     const redisValue = watchGraphsDto.webhookEndpoint;
  //     // eslint-disable-next-line no-await-in-loop
  //     await this.redis.rpush(redisKey, redisValue);
  //   });
  // }

  // async getGraphs(queryParams: GraphsQueryParamsDto): Promise<UserGraphDto[]> {
  //   const { msaIds, privacyType } = queryParams;
  //   const graphKeyPairs = queryParams.graphKeyPairs || [];
  //   const graphs: UserGraphDto[] = [];
  //   // eslint-disable-next-line no-restricted-syntax
  //   for (const msaId of msaIds) {
  //     const dsnpUserId: MessageSourceId = this.blockchainService.api.registry.createType('MessageSourceId', msaId);
  //     // eslint-disable-next-line no-await-in-loop
  //     const graphEdges = await this.asyncDebouncerService.getGraphForMsaId(dsnpUserId, privacyType, graphKeyPairs);
  //     graphs.push({
  //       msaId,
  //       dsnpGraphEdges: graphEdges,
  //     });
  //   }
  //   return graphs;
  // }

  // eslint-disable-next-line class-methods-use-this
  // private calculateJobId(jobWithoutId: ProviderGraphDto): string {
  //   const stringVal = JSON.stringify(jobWithoutId);
  //   return createHash('sha1').update(stringVal).digest('base64url');
  // }
}
