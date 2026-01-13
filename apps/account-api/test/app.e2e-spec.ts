import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import { CacheMonitorService } from '#cache/cache-monitor.service';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';

describe('Account Service E2E request verification!', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let httpServer: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IAccountApiConfig>(apiConfig.KEY);
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

    // Make sure we're connected to the chain before running tests
    const blockchainService = app.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    await blockchainService.isReady();

    httpServer = app.getHttpServer();

    // Redis timeout keeping test suite alive for too long; disable
    const cacheMonitor = app.get<CacheMonitorService>(CacheMonitorService);
    cacheMonitor.startConnectionTimer = jest.fn();
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
          siwfNodeRpcUrl: expect.any(String), // Changed from URL to String
          siwfUrl: expect.any(String),
          siwfV2URIValidation: expect.arrayContaining([expect.any(String)]),
        };

        if (Object.prototype.hasOwnProperty.call(res.body.config, 'siwfV2Url')) {
          baseConfigExpectation.siwfV2Url = expect.anything();
        }

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

  it('GET /v1/frequency/blockinfo returns block info', async () => {
    await request(app.getHttpServer())
      .get('/v1/frequency/blockinfo')
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            blocknumber: expect.any(Number),
            finalized_blocknumber: expect.any(Number),
            genesis: expect.any(String),
            runtime_version: expect.any(Number),
          }),
        );
      });
  });
});
