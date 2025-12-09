import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { ApiModule } from '../src/api.module';
import { validOnChainContent } from './mockRequestData';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import {
  CONFIGURED_QUEUE_NAMES_PROVIDER,
  CONFIGURED_QUEUE_PREFIX_PROVIDER,
  ContentPublishingQueues as QueueConstants,
} from '#types/constants';

const randomString = (length: number, _unused) =>
  randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

validOnChainContent.payload = randomString(1024, null);

describe('Content Publishing Health Controller E2E Tests', () => {
  let app: NestExpressApplication;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApiModule],
      providers: [
        {
          provide: CONFIGURED_QUEUE_NAMES_PROVIDER,
          useValue: QueueConstants.CONFIGURED_QUEUES.queues.map(({ name }) => name),
        },
        {
          provide: CONFIGURED_QUEUE_PREFIX_PROVIDER,
          useValue: 'content-publishing::bull',
        },
      ],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IContentPublishingApiConfig>(apiConfig.KEY);
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        enableDebugMessages: true,
      }),
    );
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });
    app.useLogger(app.get(Logger));

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();
  });

  it('(GET) /healthz', () =>
    request(app.getHttpServer())
      .get('/healthz')
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            status: 200,
            message: 'Service is healthy',
            timestamp: expect.any(Number),
            config: expect.objectContaining({
              apiBodyJsonLimit: expect.any(String),
              apiPort: expect.any(Number),
              apiTimeoutMs: expect.any(Number),
              fileUploadMaxSizeBytes: expect.any(Number),
              fileUploadCountLimit: expect.any(Number),
              providerId: expect.any(String),
            }),
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
    request(app.getHttpServer()).get('/livez').expect(200).expect({ status: 200, message: 'Service is live' }));

  it('(GET) /readyz', () =>
    request(app.getHttpServer()).get('/readyz').expect(200).expect({ status: 200, message: 'Service is ready' }));

  it('(GET) /metrics', () => request(app.getHttpServer()).get('/metrics').expect(200));

  afterAll(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  });
});
