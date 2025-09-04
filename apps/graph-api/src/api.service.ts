import { BeforeApplicationShutdown, Inject, Injectable } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { GraphQueues as QueueConstants } from '#types/constants/queue.constants';
import {
  ProviderGraphDto,
  GraphChangeResponseDto,
  WatchGraphsDto,
  GraphsQueryParamsDto,
  UserGraphDto,
} from '#types/dtos/graph';
import { ProviderGraphUpdateJob } from '#types/interfaces/graph';
import { AsyncDebouncerService } from '#graph-lib/services/async_debouncer';
import {
  DEBOUNCER_CACHE_KEY,
  LAST_PROCESSED_DSNP_ID_KEY,
  REDIS_WEBHOOK_ALL,
  REDIS_WEBHOOK_PREFIX,
} from '#types/constants';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { EncryptionService } from '#graph-lib/services/encryption.service';
import { PinoLogger } from 'nestjs-pino';

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
  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private graphChangeRequestQueue: Queue,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private readonly asyncDebouncerService: AsyncDebouncerService,
    private readonly encryptionService: EncryptionService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  beforeApplicationShutdown(_signal?: string | undefined) {
    try {
      this.redis.del(DEBOUNCER_CACHE_KEY);
      this.redis.del(LAST_PROCESSED_DSNP_ID_KEY);
      this.logger.info('Cleanup on shutdown completed.');
    } catch (e) {
      this.logger.error(`Error during cleanup on shutdown: ${e}`);
    }
  }

  async enqueueRequest(request: ProviderGraphDto): Promise<GraphChangeResponseDto> {
    const { providerId } = this.blockchainConf;
    const encryptionResult = await this.encryptionService.encryptPrivateKeys(request.graphKeyPairs);
    const data: ProviderGraphUpdateJob = {
      dsnpId: request.dsnpId,
      providerId: providerId.toString(),
      connections: request.connections.data,
      graphKeyPairs: encryptionResult?.result ?? request.graphKeyPairs,
      referenceId: this.calculateJobId(request),
      updateConnection: false,
      webhookUrl: request.webhookUrl,
      encryptionPublicKey: encryptionResult?.encryptionPublicKey ?? null,
      encryptionSenderContext: encryptionResult?.senderContext ?? null,
    };
    const jobOld = await this.graphChangeRequestQueue.getJob(data.referenceId);
    if (jobOld && (await jobOld.isCompleted())) {
      await jobOld.remove();
    }
    const job = await this.graphChangeRequestQueue.add(`Request Job - ${data.referenceId}`, data, {
      jobId: data.referenceId,
    });
    this.logger.debug(JSON.stringify(job));
    return {
      referenceId: data.referenceId,
    };
  }

  /**
   * Adds webhook registrations for a list of MSA Ids to the set
   * of webhooks in the Redis cache. Returns whether any new
   * webhooks were added.
   * @param {any} watchGraphsDto:WatchGraphsDto
   * @returns {boolean} Whether any new webhooks were registered
   */
  async watchGraphs(watchGraphsDto: WatchGraphsDto): Promise<boolean> {
    let itemsAdded = false;
    const ids = watchGraphsDto?.dsnpIds || [REDIS_WEBHOOK_ALL];

    for (const dsnpId of ids) {
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
        await this.redis
          .hget(REDIS_WEBHOOK_PREFIX, msaId)
          .then((webhooksStr) => (webhooksStr ? (JSON.parse(webhooksStr) as string[]) : [])),
      );
      if (existingWebhooks.size === 0 || !existingWebhooks.has(url)) {
        webhookAdded = true;
        this.logger.trace(`Registering webhook for MSA ${msaId}: ${url}`);
      }
      existingWebhooks.add(url);
      await this.redis.hset(REDIS_WEBHOOK_PREFIX, msaId, JSON.stringify([...existingWebhooks]));
      return webhookAdded;
    } catch (err: any) {
      this.logger.error(err, 'Error adding webhook');
      throw err;
    }
  }

  async getAllWebhooks(): Promise<Record<string, string[]>> {
    let cursor = '0';
    let value: string[];
    const result = {};
    do {
      [cursor, value] = await this.redis.hscan(REDIS_WEBHOOK_PREFIX, cursor);
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
    const value = await this.redis.hget(REDIS_WEBHOOK_PREFIX, msaId);
    let webhooks = value ? (JSON.parse(value) as string[]) : [];

    if (includeAll) {
      const all = await this.redis.hget(REDIS_WEBHOOK_PREFIX, REDIS_WEBHOOK_ALL);
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
    await this.redis.del(REDIS_WEBHOOK_PREFIX);
  }

  async deleteWebhooksForUser(msaId: string): Promise<void> {
    await this.redis.hdel(REDIS_WEBHOOK_PREFIX, msaId);
  }

  async removeWebhookFromUser(msaId: string, url: string): Promise<void> {
    const webhooksForUser = new Set(await this.getWebhooksForMsa(msaId));
    if (webhooksForUser.delete(url)) {
      if (webhooksForUser.size === 0) {
        await this.deleteWebhooksForUser(msaId);
      } else {
        await this.redis.hset(REDIS_WEBHOOK_PREFIX, msaId, JSON.stringify([...webhooksForUser]));
      }
    }
  }

  async deleteWebhooksForUrl(url: string): Promise<void> {
    const msaIds = await this.getWatchedGraphsForUrl(url);
    await Promise.all(msaIds.map((msaId) => this.removeWebhookFromUser(msaId, url)));
  }

  async getGraphs(queryParams: GraphsQueryParamsDto): Promise<UserGraphDto[]> {
    const { dsnpIds, privacyType, connectionType } = queryParams;
    const graphKeyPairs = queryParams.graphKeyPairs || [];
    const graphs: UserGraphDto[] = [];

    for (const dsnpId of dsnpIds) {
      try {
        const graphEdges = await this.asyncDebouncerService.getGraphForDsnpId(
          dsnpId,
          privacyType,
          connectionType,
          graphKeyPairs,
        );
        graphs.push({
          dsnpId,
          dsnpGraphEdges: graphEdges,
        });
      } catch (e: any) {
        graphs.push({
          dsnpId,
          errorMessage: e.message,
        });
      }
    }
    return graphs;
  }

  private calculateJobId(jobWithoutId: ProviderGraphDto): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }
}
