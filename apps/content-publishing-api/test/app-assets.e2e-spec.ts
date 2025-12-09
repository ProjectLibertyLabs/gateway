import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { ApiModule } from '../src/api.module';
import { HealthCheckModule } from '#health-check/health-check.module';
import { validOnChainContent, randomFile30K } from './mockRequestData';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, PinoLogger } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';

const randomString = (length: number, _unused) =>
  randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

validOnChainContent.payload = randomString(1024, null);

describe('Content Publishing /asset Controller E2E Tests', () => {
  let app: NestExpressApplication;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApiModule, HealthCheckModule],
    }).compile();

    // To enable logging in tests, set ENABLE_LOGS_IN_TESTS=true in the environment
    app = module.createNestApplication({ logger: new Logger(new PinoLogger(getPinoHttpOptions()), {}) });
    app.useLogger(app.get(Logger));

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

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  });

  describe('/v1/asset/upload', () => {
    it('upload request with no files should fail', async () => {
      await request(app.getHttpServer())
        .put('/v1/asset/upload')
        .expect(422)
        .expect((res) => expect(res.body.message).toBe('File is required'));
    });

    it('too many files in a single upload request should fail', async () => {
      let req = request(app.getHttpServer()).put('/v1/asset/upload');
      for (const i of Array(11).keys()) {
        req = req.attach('files', randomFile30K, `file${i}.jpg`);
      }
      await req.expect(400).expect((res) => expect(res.body.message).toBe('Too many files'));
    });

    it('MIME type not in whitelist should fail', async () => {
      await request(app.getHttpServer())
        .put('/v1/asset/upload')
        .attach('files', randomFile30K, 'file.bmp')
        .expect(422)
        .expect((res) => expect(res.body.message).toMatch(/Validation failed.*current file type is.*expected type is/));
    });

    it.each([
      { mimeType: 'image/jpeg' },
      { mimeType: 'image/png' },
      { mimeType: 'image/gif' },
      { mimeType: 'image/webp' },
      { mimeType: 'image/svg+xml' },
      { mimeType: 'video/mpeg' },
      { mimeType: 'video/ogg' },
      { mimeType: 'video/webm' },
      { mimeType: 'video/H265' },
      { mimeType: 'video/mp4' },
      { mimeType: 'audio/mpeg' },
      { mimeType: 'audio/ogg' },
      { mimeType: 'audio/webm' },
      { mimeType: 'application/vnd.apache.parquet' },
      { mimeType: 'application/x-parquet' },
    ])('valid request with legal assets ($mimeType) should work!', async ({ mimeType }) => {
      await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', randomFile30K, { filename: 'file', contentType: mimeType })
        .expect(202)
        .expect((res) => expect(res.body.assetIds.length).toBe(1));
    });
  });

  describe('/v2/asset/upload', () => {
    it('upload request with no files should fail', async () => {
      await request(app.getHttpServer()).post('/v2/asset/upload').expect(500);
    });

    it('endpoint should only accept max number of allowed files', async () => {
      let req = request(app.getHttpServer()).post('/v2/asset/upload');
      for (const i of Array(11).keys()) {
        req = req.attach('files', randomFile30K, `file${i}.jpg`);
      }
      await req
        .expect(202)
        .expect((res) => expect(res.body.files.length).toBe(11))
        .expect((res) => expect(res.body.files[10].error).toMatch(/Max file/));
    });

    it('MIME type not in whitelist should fail', async () => {
      await request(app.getHttpServer())
        .post('/v2/asset/upload')
        .attach('files', randomFile30K, 'file.bmp')
        .expect(202)
        .expect((res) => expect(res.body.files[0].error).toMatch(/Unsupported file type/));
    });

    it.each([
      { mimeType: 'image/jpeg' },
      { mimeType: 'image/png' },
      { mimeType: 'image/gif' },
      { mimeType: 'image/webp' },
      { mimeType: 'image/svg+xml' },
      { mimeType: 'video/mpeg' },
      { mimeType: 'video/ogg' },
      { mimeType: 'video/webm' },
      { mimeType: 'video/H265' },
      { mimeType: 'video/mp4' },
      { mimeType: 'audio/mpeg' },
      { mimeType: 'audio/ogg' },
      { mimeType: 'audio/webm' },
      { mimeType: 'application/vnd.apache.parquet' },
      { mimeType: 'application/x-parquet' },
    ])('valid request with legal assets ($mimeType) should work!', async ({ mimeType }) => {
      await request(app.getHttpServer())
        .post(`/v2/asset/upload`)
        .attach('files', randomFile30K, { filename: 'file', contentType: mimeType })
        .expect(202)
        .expect((res) => expect(res.body.files[0].cid).toBeTruthy());
    });
  });
});
