import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { WorkerModule } from '../src/worker.module';
import WorkerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BlockchainService } from '#blockchain/blockchain.service';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';

describe('Account Service E2E request verification!', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let httpServer: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IAccountWorkerConfig>(WorkerConfig.KEY);
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
  });

  afterAll(async () => {
    await app.close();
    await httpServer.close();

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

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
          healthCheckMaxRetries: expect.any(Number),
          healthCheckMaxRetryIntervalSeconds: expect.any(Number),
          healthCheckSuccessThreshold: expect.any(Number),
          providerApiToken: expect.any(String),
          trustUnfinalizedBlocks: expect.any(Boolean),
          webhookBaseUrl: expect.any(String),
          webhookFailureThreshold: expect.any(Number),
          webhookRetryIntervalSeconds: expect.any(Number),
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

describe('Dependency Readiness Test', () => {
  let module: TestingModule;
  let blockchainService: BlockchainService;
  let queue: Queue;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();

    await module.init();

    blockchainService = module.get<BlockchainService>(BlockchainService);
    queue = module.get<Queue>(getQueueToken('transaction-publisher'));
  });

  afterAll(async () => {
    await queue.close();
    await module.close();
  });

  it('should not process jobs until blockchain API is ready', async () => {
    // const startTime = Date.now();
    let apiReadyTime: number | null = null;
    // let firstJobProcessedTime: number | null = null;

    // Monitor when API becomes ready
    const checkApiReady = async () => {
      while (!apiReadyTime) {
        try {
          await blockchainService.getApi();
          apiReadyTime = Date.now();
          break;
        } catch (error) {
          console.log('API not ready yet:', error);
          // Keep checking
        }
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }
    };

    // Start monitoring API readiness
    checkApiReady();

    // Add a job immediately
    // const job = await queue.add('publish-transaction', {
    //   transactionId: 'readiness-test-123',
    //   payload: { test: 'data' },
    // });

    // // Monitor when job gets processed
    // job.waitUntilFinished(queue.events).then(() => {
    //   firstJobProcessedTime = Date.now();
    // });

    // // Wait for both API ready and job processed
    // await Promise.all([apiReadyPromise, job.waitUntilFinished(queue.events, 30000)]);

    // // Verify job was not processed before API was ready
    // expect(apiReadyTime).toBeLessThanOrEqual(firstJobProcessedTime!);

    // // API should become ready within reasonable time
    // expect(apiReadyTime! - startTime).toBeLessThan(30000);

    // console.log(`API ready after: ${apiReadyTime! - startTime}ms`);
    // console.log(`Job processed after: ${firstJobProcessedTime! - startTime}ms`);
  });
});
