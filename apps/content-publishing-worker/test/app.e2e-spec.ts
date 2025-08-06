import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import WorkerConfig, { IContentPublishingWorkerConfig } from '#content-publishing-worker/worker.config';
import { Module, ValidationPipe, VersioningType } from '@nestjs/common';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from '#content-publishing-worker/health_check/health.controller';
import { HealthCheckService } from '#health-check/health-check.service';
import { PrometheusModule } from '@willsoto/nestjs-prometheus/dist/module';
import { createPrometheusConfig } from '#logger-lib/prometheus-common-config';
import { CacheModule } from '#cache/cache.module';
import { NONCE_SERVICE_REDIS_NAMESPACE } from '#blockchain/blockchain.service';
import blockchainConfig, { addressFromSeedPhrase } from '#blockchain/blockchain.config';
import cacheConfig from '#cache/cache.config';
import { BlockchainModule } from '#blockchain/blockchain.module';
import {
  CONFIGURED_QUEUE_NAMES_PROVIDER,
  CONFIGURED_QUEUE_PREFIX_PROVIDER,
  ContentPublishingQueues as QueueConstants,
  HEALTH_CONFIGS,
} from '#types/constants';

const configs = [WorkerConfig, blockchainConfig, cacheConfig];

// Test Module for Content Publishing Worker, to avoid managing processing queues and other dependencies
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
    }),
    PrometheusModule.register(createPrometheusConfig('content-publishing-worker')),
    CacheModule.forRootAsync({
      useFactory: (blockchainConf, cacheConf) => [
        {
          ...cacheConf.redisOptions,
          keyPrefix: cacheConf.cacheKeyPrefix,
        },
        {
          ...cacheConf.redisOptions,
          namespace: NONCE_SERVICE_REDIS_NAMESPACE,
          keyPrefix: `${NONCE_SERVICE_REDIS_NAMESPACE}:${addressFromSeedPhrase(blockchainConf.providerKeyUriOrPrivateKey)}:`,
        },
      ],
      inject: [blockchainConfig.KEY, cacheConfig.KEY],
    }),
    BlockchainModule.forRootAsync(),
    EventEmitterModule.forRoot({
      // Use this instance throughout the application
      global: true,
      // set this to `true` to use wildcards
      wildcard: false,
      // the delimiter used to segment namespaces
      delimiter: '.',
      // set this to `true` if you want to emit the newListener event
      newListener: false,
      // set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 20,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: CONFIGURED_QUEUE_NAMES_PROVIDER,
      useValue: QueueConstants.CONFIGURED_QUEUES.queues.map(({ name }) => name),
    },
    {
      provide: CONFIGURED_QUEUE_PREFIX_PROVIDER,
      useValue: 'content-publishing::bull',
    },
    {
      provide: HEALTH_CONFIGS,
      useFactory: (...registeredConfigs: any[]) => registeredConfigs,
      inject: configs.map((c) => c.KEY),
    },
    HealthCheckService,
  ],
})
class TestWorkerModule {}

describe('Content Publishing Worker E2E request verification!', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let httpServer: any;

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
