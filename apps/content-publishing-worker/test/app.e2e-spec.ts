import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import WorkerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';
import { Module, ValidationPipe, VersioningType } from '@nestjs/common';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkerModule } from '#content-publishing-worker/worker.module';
import { getQueueToken } from '@nestjs/bull-shared';
import { ContentPublishingQueues } from '#types/constants';
import PUBLISH_QUEUE_NAME = ContentPublishingQueues.PUBLISH_QUEUE_NAME;
import { Queue, QueueEvents } from 'bullmq';
import { IContextTxResult, IPublisherJob } from '#types/interfaces';
import { TxStatusMonitoringService } from '#content-publishing-worker/monitor/tx.status.monitor.service';
import { SignedBlock } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { BlockchainService } from '#blockchain/blockchain.service';

process.env.CACHE_KEY_PREFIX = 'content-publishing-e2e:';

// Test Module for Content Publishing Worker, to avoid managing processing queues and other dependencies
@Module({
  imports: [WorkerModule],
})
class TestWorkerModule {}

describe('Content Publishing Worker E2E request verification!', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let httpServer: any;
  let publishQueueEvents: QueueEvents;
  let publishQueue: Queue;
  let txMonitor: TxStatusMonitoringService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TestWorkerModule],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IContentPublishingWorkerConfig>(WorkerConfig.KEY);
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, enableDebugMessages: true }));
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();

    httpServer = app.getHttpServer();
    publishQueue = app.get(getQueueToken(PUBLISH_QUEUE_NAME));
    publishQueueEvents = new QueueEvents(PUBLISH_QUEUE_NAME, {
      connection: (publishQueue as any).opts?.connection,
      prefix: (publishQueue as any).opts?.prefix,
    });
    await publishQueueEvents.waitUntilReady();
    txMonitor = app.get<TxStatusMonitoringService>(TxStatusMonitoringService);
  });

  afterAll(async () => {
    // Wait a bit for block scanning to finish
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1_000);
    });
    await publishQueueEvents.close();
    await app.close();
    await httpServer.close();

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

  describe('Health checks', () => {
    it('(GET) /healthz', () =>
      request(httpServer)
        .get('/healthz')
        .expect(200)
        .then((res) => {
          const baseConfigExpectation: { [key: string]: any } = {
            apiBodyJsonLimit: expect.any(String),
            apiPort: expect.any(Number),
            apiTimeoutMs: expect.any(Number),
            blockchainScanIntervalSeconds: expect.any(Number),
            trustUnfinalizedBlocks: expect.any(Boolean),
            assetExpirationIntervalSeconds: expect.any(Number),
            assetUploadVerificationDelaySeconds: expect.any(Number),
            batchIntervalSeconds: expect.any(Number),
            batchMaxCount: expect.any(Number),
          };

          expect(res.body).toEqual(
            expect.objectContaining({
              status: 200,
              message: 'Service is healthy',
              timestamp: expect.any(Number),
              config: expect.objectContaining(baseConfigExpectation),
              redisStatus: expect.objectContaining({
                connected_clients: expect.any(Number),
                maxmemory: expect.any(Number),
                redis_version: expect.any(String),
                uptime_in_seconds: expect.any(Number),
                used_memory: expect.any(Number),
                queues: expect.arrayContaining([
                  expect.objectContaining({
                    name: expect.any(String),
                    waiting: expect.any(Number),
                    active: expect.any(Number),
                    completed: expect.any(Number),
                    failed: expect.any(Number),
                    delayed: expect.any(Number),
                  }),
                ]),
              }),
              blockchainStatus: expect.objectContaining({
                frequencyApiWsUrl: expect.any(String),
                latestBlockHeader: expect.objectContaining({
                  blockHash: expect.any(String),
                  number: expect.any(Number),
                  parentHash: expect.any(String),
                }),
              }),
            }),
          );
        }));

    it('(GET) /livez', () =>
      request(httpServer).get('/livez').expect(200).expect({ status: 200, message: 'Service is live' }));

    it('(GET) /readyz', () =>
      request(httpServer).get('/readyz').expect(200).expect({ status: 200, message: 'Service is ready' }));

    it('(GET) /metrics', () => request(httpServer).get('/metrics').expect(200));
  });

  describe('Announce on-chain', () => {
    let publisherQueue: Queue = null;
    beforeAll(async () => {
      publisherQueue = app.get(getQueueToken(PUBLISH_QUEUE_NAME));
    });

    it('submits a message to the chain and is included in a block', async () => {
      let testResolve, testReject;
      const testPromise = new Promise((innerResolve, innerReject) => {
        testResolve = innerResolve;
        testReject = innerReject;
      });
      let result: IContextTxResult;

      function deferred<T>() {
        let resolve!: (v: T) => void;
        let reject!: (e: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      }

      const txHashD = deferred<string>();
      const handleFoundTransaction = async (block: SignedBlock, blockEvent: FrameSystemEventRecord) => {
        const txHash = await txHashD.promise;
        // Find transaction in block
        const txIndex = block.block.extrinsics.findIndex((extrinsic) => extrinsic.hash.toHex() === txHash);
        if (txIndex === -1) {
          return;
        }
        if (blockEvent.phase.isApplyExtrinsic && blockEvent.phase.asApplyExtrinsic.eq(txIndex)) {
          if (blockEvent.event.section === 'system') {
            if (blockEvent.event.method === 'ExtrinsicSuccess') {
              testResolve();
            } else if (blockEvent.event.method === 'ExtrinsicFailed') {
              testReject();
            }
          }
        }
      };

      txMonitor.registerChainEventHandler(
        ['system.ExtrinsicSuccess', 'system.ExtrinsicFailed'],
        handleFoundTransaction,
      );

      const jobId = 'publishing-job';
      const jobData: IPublisherJob = {
        id: jobId,
        schemaId: 17,
        data: {
          cid: 'bagaaierasords4njcts6vs7qvdjfcvgnume4hqohf65zsfguprqphs3icwea',
          payloadLength: 61,
        },
      };
      const job = await publisherQueue.add(jobId, jobData, {
        jobId,
      });
      result = await job.waitUntilFinished(publishQueueEvents);
      txHashD.resolve(result.txHash);

      await expect(testPromise).resolves.toBeUndefined();
    }, 18_000);
  });
});
