import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import * as QueueConstants from '#lib/utils/queues';
import * as RedisConstants from '#lib/utils/redis';
import {
  AsyncDebouncerService,
  BlockchainService,
  ConfigService,
  GraphChangeRepsonseDto,
  GraphStateManager,
  GraphsQueryParamsDto,
  ProviderGraphDto,
  ProviderGraphUpdateJob,
  UserGraphDto,
  WatchGraphsDto,
} from '#lib';

async function hscanToObject(keyValues: string[]) {
  const result = {};

  for (let i = 0; i < keyValues.length; i += 2) {
    const field = keyValues[i];
    const value = JSON.parse(keyValues[i + 1]);
    result[field] = value;
  }
  return result;
}

@Injectable()
export class ApiService implements BeforeApplicationShutdown {
  private readonly logger: Logger;

  private asyncDebouncerService: AsyncDebouncerService;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private graphChangeRequestQueue: Queue,
    private graphStateManager: GraphStateManager,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.asyncDebouncerService = new AsyncDebouncerService(this.redis, this.configService, this.graphStateManager);
  }

  beforeApplicationShutdown(_signal?: string | undefined) {
    try {
      this.redis.del(QueueConstants.DEBOUNCER_CACHE_KEY);
      this.redis.del(QueueConstants.LAST_PROCESSED_DSNP_ID_KEY);
      this.logger.log('Cleanup on shutdown completed.');
    } catch (e) {
      this.logger.error(`Error during cleanup on shutdown: ${e}`);
    }
  }

  async enqueueRequest(request: ProviderGraphDto): Promise<GraphChangeRepsonseDto> {
    const providerId = this.configService.getProviderId();
    const data: ProviderGraphUpdateJob = {
      dsnpId: request.dsnpId,
      providerId,
      connections: request.connections.data,
      graphKeyPairs: request.graphKeyPairs,
      referenceId: this.calculateJobId(request),
      updateConnection: this.configService.getReconnectionServiceRequired(),
    };
    const jobOld = await this.graphChangeRequestQueue.getJob(data.referenceId);
    if (jobOld && (await jobOld.isCompleted())) {
      await jobOld.remove();
    }
    const job = await this.graphChangeRequestQueue.add(`Request Job - ${data.referenceId}`, data, { jobId: data.referenceId });
    this.logger.debug(job);
    return {
      referenceId: data.referenceId,
    };
  }

  /**
   * Adds webhook registrations for a list of MSA IDs to the set
   * of webhooks in the Redis cache. Returns whether any new
   * webhooks were added.
   * @param {any} watchGraphsDto:WatchGraphsDto
   * @returns {boolean} Whether any new webhooks were registered
   */
  async watchGraphs(watchGraphsDto: WatchGraphsDto): Promise<boolean> {
    let itemsAdded = false;
    const ids = watchGraphsDto?.dsnpIds || [RedisConstants.REDIS_WEBHOOK_ALL];
    for (const dsnpId of ids) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.watchGraphForMsa(dsnpId, watchGraphsDto.webhookEndpoint);
      itemsAdded = itemsAdded || result;
    }

    return itemsAdded;
  }

  async watchGraphForMsa(msaId: string, webhook: string): Promise<boolean> {
    try {
      let webhookAdded = false;
      const url = new URL(webhook).toString();
      const existingWebhooks = new Set(
        await this.redis.hget(RedisConstants.REDIS_WEBHOOK_PREFIX, msaId).then((webhooksStr) => {
          return webhooksStr ? (JSON.parse(webhooksStr) as string[]) : [];
        }),
      );
      if (existingWebhooks.size === 0 || !existingWebhooks.has(url)) {
        webhookAdded = true;
        this.logger.verbose(`Registering webhook for MSA ${msaId}: ${url}`);
      }
      existingWebhooks.add(url);
      await this.redis.hset(RedisConstants.REDIS_WEBHOOK_PREFIX, msaId, JSON.stringify([...existingWebhooks]));
      return webhookAdded;
    } catch (err: any) {
      this.logger.error('Error adding webhook', err);
      throw err;
    }
  }

  async getAllWebhooks(): Promise<Record<string, string[]>> {
    let cursor = '0';
    let value: string[];
    const result = {};
    do {
      [cursor, value] = await this.redis.hscan(RedisConstants.REDIS_WEBHOOK_PREFIX, cursor);
      Object.assign(result, await hscanToObject(value));
    } while (cursor !== '0');
    return result;
  }

  /**
   * Return all URLs registered as webhooks for the given MSA
   *
   * @param {string} msaId:string
   * @returns {string[]} Array of URLs
   */
  async getWebhooksForMsa(msaId: string, includeAll = true): Promise<string[]> {
    const value = await this.redis.hget(RedisConstants.REDIS_WEBHOOK_PREFIX, msaId);
    let webhooks = value ? (JSON.parse(value) as string[]) : [];

    if (includeAll) {
      const all = await this.redis.hget(RedisConstants.REDIS_WEBHOOK_PREFIX, RedisConstants.REDIS_WEBHOOK_ALL);
      const allHooks = all ? (JSON.parse(all) as string[]) : [];
      webhooks.push(...allHooks);
      webhooks = [...new Set(webhooks)];
    }

    return webhooks;
  }

  async getWatchedGraphsForUrl(url: string): Promise<string[]> {
    const msasForUrl: string[] = [];
    const registeredWebhooks = await this.getAllWebhooks();
    Object.entries(registeredWebhooks).forEach(([msaId, urls]) => {
      if (urls.some((hookUrl) => hookUrl === url)) {
        msasForUrl.push(msaId);
      }
    });

    return msasForUrl;
  }

  async deleteAllWebhooks(): Promise<void> {
    await this.redis.del(RedisConstants.REDIS_WEBHOOK_PREFIX);
  }

  async deleteWebhooksForUser(msaId: string): Promise<void> {
    await this.redis.hdel(RedisConstants.REDIS_WEBHOOK_PREFIX, msaId);
  }

  async removeWebhookFromUser(msaId: string, url: string): Promise<void> {
    const webhooksForUser = new Set(await this.getWebhooksForMsa(msaId));
    if (webhooksForUser.delete(url)) {
      if (webhooksForUser.size === 0) {
        await this.deleteWebhooksForUser(msaId);
      } else {
        await this.redis.hset(RedisConstants.REDIS_WEBHOOK_PREFIX, msaId, JSON.stringify([...webhooksForUser]));
      }
    }
  }

  async deleteWebhooksForUrl(url: string): Promise<void> {
    const msaIds = await this.getWatchedGraphsForUrl(url);
    await Promise.all(msaIds.map((msaId) => this.removeWebhookFromUser(msaId, url)));
  }

  async getGraphs(queryParams: GraphsQueryParamsDto): Promise<UserGraphDto[]> {
    const { dsnpIds, privacyType } = queryParams;
    const graphKeyPairs = queryParams.graphKeyPairs || [];
    const graphs: UserGraphDto[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const dsnpId of dsnpIds) {
      // eslint-disable-next-line no-await-in-loop
      const graphEdges = await this.asyncDebouncerService.getGraphForDsnpId(dsnpId, privacyType, graphKeyPairs);
      graphs.push({
        dsnpId,
        dsnpGraphEdges: graphEdges,
      });
    }
    return graphs;
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: ProviderGraphDto): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }
}
