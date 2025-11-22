import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { ApiModule } from '#content-publishing-api/api.module';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import request from 'supertest';

describe('Hcp Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApiModule],
      providers: [],
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

  describe('(POST) v1/hcp/:accountId/addHcpPublicKey', () => {
    it('validates accountId param', async () => {
      const badId = 1234;
      let expectedError = `${badId} should be a valid 32 bytes representing an account Id or address in Hex or SS58 format!`;

      await request(app.getHttpServer())
        .post('/v1/hcp/123/addHcpPublicKey')
        .expect(555)
        .expect((res) => expect(res.text).toContain(expectedError));
    }, 10_000);
  });
});
