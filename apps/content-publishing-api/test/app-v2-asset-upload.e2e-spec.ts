import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { ApiModule } from '../src/api.module';
import { HealthCheckModule } from '#health-check/health-check.module';
import {
  validOnChainContent,
  validReaction,
  assetMetaDataInvalidMimeType,
  validTombstone,
  generateBroadcast,
  generateReply,
  generateUpdate,
  generateProfile,
} from './mockRequestData';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import Redis from 'ioredis';
import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';
import { Logger, PinoLogger } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';
import { ContentPublisherRedisConstants } from '#types/constants';
import getAssetMetadataKey = ContentPublisherRedisConstants.getAssetMetadataKey;

const randomString = (length: number, _unused) =>
  randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

validOnChainContent.payload = randomString(1024, null);

const sleep = (ms: number) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

const msaId = '123';

describe('Content Publishing E2E Endpoint Verification', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let redis: Redis;

  const randomFile30K = Buffer.from('h'.repeat(30 * 1024)); // 30KB

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

    redis = app.get<Redis>(getRedisToken(DEFAULT_REDIS_NAMESPACE));
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

    it('valid request with legal assets should work!', async () => {
      await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', randomFile30K, 'file1.jpg')
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

    it('valid request with legal assets should work!', async () => {
      await request(app.getHttpServer())
        .post(`/v2/asset/upload`)
        .attach('files', randomFile30K, 'file1.jpg')
        .expect(202)
        .expect((res) => expect(res.body.files[0].cid).toBeTruthy());
    });
  });

  describe('V1 Content and Profile', () => {
    const missingAssetId = '9876543210';
    const badMimeTypeReferenceId = '0123456789';

    beforeAll(async () => {
      // Modify the asset cache with a disallowed MIME type asset
      await redis.set(getAssetMetadataKey(badMimeTypeReferenceId), JSON.stringify(assetMetaDataInvalidMimeType));
    });

    describe('announcements with missing assets', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: generateBroadcast([missingAssetId]),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: generateReply([missingAssetId]),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: generateUpdate([missingAssetId]),
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: generateProfile([missingAssetId]),
        },
      ])('$operation $endpoint should fail with missing asset reference', async ({ endpoint, operation, payload }) => {
        const resolvedEndpoint = endpoint.replace(':msaId', msaId);
        return request(app.getHttpServer())
          [operation.toLowerCase()](resolvedEndpoint)
          .send(payload)
          .expect(400)
          .expect((res) =>
            expect(res.body.message).toEqual(
              expect.arrayContaining([expect.stringMatching(/referenceId.*does not exist/)]),
            ),
          );
      });
    });

    describe('announcements with invalid MIME type reference', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: generateBroadcast([badMimeTypeReferenceId]),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: generateReply([badMimeTypeReferenceId]),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: generateUpdate([badMimeTypeReferenceId]),
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: generateProfile([badMimeTypeReferenceId]),
        },
      ])(
        '$operation $endpoint with invalid MIME type reference should fail',
        async ({ endpoint, operation, payload }) => {
          const resolvedEndpoint = endpoint.replace(':msaId', msaId);
          return request(app.getHttpServer())
            [operation.toLowerCase()](resolvedEndpoint)
            .send(payload)
            .expect(400)
            .expect((res) =>
              expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/invalid MIME type/)])),
            );
        },
      );
    });

    describe('announcements with no asset references', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: generateBroadcast(),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: generateReply(),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: generateUpdate(),
        },
        {
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: validReaction,
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'DELETE',
          payload: validTombstone,
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: generateProfile(),
        },
      ])(
        '$operation $endpoint should work!',
        async ({ endpoint, operation, payload }) => {
          const resolvedEndpoint = endpoint.replace(':msaId', msaId);
          return request(app.getHttpServer())
            [operation.toLowerCase()](resolvedEndpoint)
            .send(payload)
            .expect(202)
            .expect((res) => expect(res.text).toContain('referenceId'));
        },
        15000,
      );
    });

    describe('announcements with valid uploaded asset', () => {
      let uploadedAssetIds: any[];

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .put('/v1/asset/upload')
          .attach('files', randomFile30K, 'file1.jpg')
          .expect(202);
        uploadedAssetIds = response.body.assetIds;
        await sleep(1000);
      });

      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: () => generateBroadcast(uploadedAssetIds),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: () => generateReply(uploadedAssetIds),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: () => generateUpdate(uploadedAssetIds),
        },
        {
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: () => validReaction,
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: () => generateProfile(uploadedAssetIds),
        },
      ])(
        '$operation $endpoint with uploaded assets should work!',
        async ({ endpoint, operation, payload }) => {
          const resolvedEndpoint = endpoint.replace(':msaId', msaId);
          return request(app.getHttpServer())
            [operation.toLowerCase()](resolvedEndpoint)
            .send(payload())
            .expect(202)
            .expect((res) => expect(res.text).toContain('referenceId'));
        },
        15000,
      );
    });
  });

  describe('V2 Content', () => {
    // Need to create an on-chain schema for this since we don't have one in the chain genesis
    it.todo('/v2/content/on-chain');

    it('/v2/content/batchAnnouncement', async () => {});
  });

  describe('V3 Content', () => {
    it.todo('/v2/content/batchAnnouncement');
  });
});
