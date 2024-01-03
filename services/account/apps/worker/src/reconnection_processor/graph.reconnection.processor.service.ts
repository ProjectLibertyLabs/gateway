import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MessageSourceId, ProviderId } from '@frequency-chain/api-augment/interfaces';
import { AxiosError, AxiosResponse } from 'axios';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { ConnectionDto, GraphKeyPairDto, IGraphUpdateJob, ProviderGraphUpdateJob, ProviderWebhookService, QueueConstants } from '../../../../libs/common/src';
import { BaseConsumer } from '../BaseConsumer';

@Injectable()
@Processor(QueueConstants.RECONNECT_REQUEST_QUEUE)
export class GraphReconnectionService extends BaseConsumer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @InjectQueue(QueueConstants.RECONNECT_REQUEST_QUEUE) private reconnectRequestQueue: Queue,
    @InjectQueue(QueueConstants.GRAPH_CHANGE_REQUEST_QUEUE) private graphChangeRequestQueuue: Queue,
    private configService: ConfigService,
    private providerWebhookService: ProviderWebhookService,
    private emitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<IGraphUpdateJob, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      let graphConnections: ConnectionDto[] = [];
      let graphKeyPairs: GraphKeyPairDto[] = [];
      try {
        [graphConnections, graphKeyPairs] = await this.getUserGraphFromProvider(job.data.dsnpId, job.data.providerId);
        if (graphConnections.length === 0) {
          this.logger.debug(`No connections found for user ${job.data.dsnpId.toString()} from provider ${job.data.providerId.toString()}`);
          return;
        }
        const providerGraphJob: ProviderGraphUpdateJob = {
          referenceId: job.id ?? '',
          dsnpId: job.data.dsnpId,
          providerId: job.data.providerId,
          connections: graphConnections,
          graphKeyPairs,
          updateConnection: false,
        };
        this.graphChangeRequestQueuue.add(`Provider Graph Job - ${providerGraphJob.referenceId}`, providerGraphJob, {
          removeOnFail: false,
          removeOnComplete: 2000,
        });
        this.logger.debug(`Found ${graphConnections.length} connections for user ${job.data.dsnpId.toString()} from provider ${job.data.providerId.toString()}`);
      } catch (e) {
        this.logger.error(`Error getting user graph from provider: ${e}`);
        throw e;
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getUserGraphFromProvider(dsnpUserId: MessageSourceId | string, providerId: ProviderId | string): Promise<any> {
    const providerAPI = this.providerWebhookService.providerApi;
    const pageSize = this.configService.getPageSize();
    const params = {
      pageNumber: 1,
      pageSize,
    };

    const allConnections: ConnectionDto[] = [];
    const keyPairs: GraphKeyPairDto[] = [];

    let hasNextPage = true;
    let webhookFailures: number = 0;

    while (hasNextPage) {
      this.logger.debug(`Fetching connections page ${params.pageNumber} for user ${dsnpUserId.toString()} from provider ${providerId.toString()}`);

      let response: AxiosResponse<any, any>;
      try {
        // eslint-disable-next-line no-await-in-loop
        response = await providerAPI.get(`/connections/${dsnpUserId.toString()}`, { params });

        // Reset webhook failures to 0 on a success. We don't go into waiting for recovery unless
        // a sequential number failures occur equaling webhookFailureThreshold.
        webhookFailures = 0;

        if (!response.data || !response.data.connections) {
          throw new Error(`Bad response from provider webhook: ${response}`);
        }

        if (response.data.dsnpId !== dsnpUserId.toString()) {
          throw new Error(`Provider webhook returned data for the wrong user: ${response.data.dsnpId}`);
        }

        const { data }: { data: ConnectionDto[] } = response.data.connections;
        allConnections.push(...data);
        const { graphKeyPairs }: { graphKeyPairs: GraphKeyPairDto[] } = response.data;
        if (graphKeyPairs) {
          keyPairs.push(...graphKeyPairs);
        }

        const { pagination } = response.data.connections;
        if (pagination && pagination.pageCount && pagination.pageCount > params.pageNumber) {
          // Increment the page number to fetch the next page
          params.pageNumber += 1;
        } else {
          // No more pages available, exit the loop
          hasNextPage = false;
        }
      } catch (error: any) {
        let newError = error;
        if (error instanceof AxiosError) {
          webhookFailures += 1;
          if (error.response) {
            newError = new Error(`Provider webhook returned error: ${error.response.status} ${error.response.statusText}`);
          } else if (error.request) {
            newError = new Error(`Provider webhook request failed: ${error.request}`);
          } else {
            newError = new Error(`Provider webhook error: ${error.message}`);
          }

          if (webhookFailures >= this.configService.getWebhookFailureThreshold()) {
            // eslint-disable-next-line no-await-in-loop
            await this.emitter.emitAsync('webhook.unhealthy');
          } else {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => {
              setTimeout(r, this.configService.getWebhookRetryIntervalSeconds());
            });
          }
        }
        throw newError;
      }
    }

    return [allConnections, keyPairs];
  }

  @OnEvent('webhook.unhealthy', { async: true, promisify: true })
  private async handleWebhookGone() {
    this.logger.debug('Received webhook.unhealthy event, pausing reconnection queue');
    await this.reconnectRequestQueue.pause();
  }

  @OnEvent('webhook.healthy', { async: true, promisify: true })
  private async handleWebhookRestored() {
    this.logger.debug('Received webhook.healthy event, resuming reconnection queue');
    await this.reconnectRequestQueue.resume();
  }
}
