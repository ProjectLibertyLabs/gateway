import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { ApiModule } from '../src/api.module';
import { HealthCheckModule } from '#health-check/health-check.module';
import {
  validContentNoUploadedAssets,
  validReplyNoUploadedAssets,
  validOnChainContent,
  validReaction,
  assetMetaDataInvalidMimeType,
  validUpdateNoUploadedAssets,
  validTombstone,
  validProfileNoUploadedAssets,
} from './mockRequestData';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import Redis from 'ioredis';
import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';

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

describe('AppController E2E v2 asset upload verification', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let redis: Redis;

  const randomFile30K = Buffer.from('h'.repeat(30 * 1024)); // 30KB

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApiModule, HealthCheckModule],
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

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();

    redis = app.get<Redis>(getRedisToken(DEFAULT_REDIS_NAMESPACE));
  });

  describe('/v1/assets/upload', () => {
    it('upload request with no files should fail', async () => {
      await request(app.getHttpServer()).put('/v1/asset/upload').expect(422);
    });

    it('too many files in a single upload request should fail', async () => {
      let req = request(app.getHttpServer()).put('/v1/asset/upload');
      for (const i of Array(11).keys()) {
        req = req.attach('files', randomFile30K, `file${i}.jpg`);
      }
      await req.expect(400);
    });

    it('MIME type not in whitelist should fail', async () => {
      await request(app.getHttpServer()).put('/v1/asset/upload').attach('files', randomFile30K, 'file.bmp').expect(422);
    });

    it('valid request with legal assets should work!', async () => {
      await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', randomFile30K, 'file1.jpg')
        .expect(202);
    });
  });

  describe('V1 Content and Profile', () => {
    const missingAssetId = '9876543210';
    const badMimeTypeReferenceId = '0123456789';

    beforeAll(async () => {
      await redis.set(badMimeTypeReferenceId, JSON.stringify(assetMetaDataInvalidMimeType));
    });

    describe('announcements with missing assets', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentNoUploadedAssets,
              assets: [{ name: 'missing asset', references: [{ referenceId: missingAssetId }] }],
            },
          },
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: {
            ...validReplyNoUploadedAssets,
            content: {
              ...validReplyNoUploadedAssets,
              assets: [{ name: 'missing asset', references: [{ referenceId: missingAssetId }] }],
            },
          },
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: {
            ...validUpdateNoUploadedAssets,
            content: {
              ...validContentNoUploadedAssets,
              assets: [{ name: 'missing asset', references: [{ referenceId: missingAssetId }] }],
            },
          },
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: {
            profile: {
              ...validProfileNoUploadedAssets,
              icon: [{ referenceId: missingAssetId }],
            },
          },
        },
      ])('$operation $endpoint should fail with missing asset reference', async ({ endpoint, operation, payload }) => {
        const resolvedEndpoint = endpoint.replace(':msaId', msaId);
        return request(app.getHttpServer())[operation.toLowerCase()](resolvedEndpoint).send(payload).expect(400);
      });
    });

    describe('announcements with invalid MIME type reference', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentNoUploadedAssets,
              assets: [{ name: 'invalid MIME type reference', references: [{ referenceId: badMimeTypeReferenceId }] }],
            },
          },
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: {
            ...validReplyNoUploadedAssets,
            content: {
              ...validContentNoUploadedAssets,
              assets: [{ name: 'invalid MIME type reference', references: [{ referenceId: badMimeTypeReferenceId }] }],
            },
          },
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: {
            ...validUpdateNoUploadedAssets,
            content: {
              ...validContentNoUploadedAssets,
              assets: [{ name: 'invalid MIME type reference', references: [{ referenceId: badMimeTypeReferenceId }] }],
            },
          },
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: {
            profile: {
              ...validProfileNoUploadedAssets,
              icon: [{ referenceId: badMimeTypeReferenceId }],
            },
          },
        },
      ])(
        '$operation $endpoint with invalid MIME type reference should fail',
        async ({ endpoint, operation, payload }) => {
          const resolvedEndpoint = endpoint.replace(':msaId', msaId);
          return request(app.getHttpServer())[operation.toLowerCase()](resolvedEndpoint).send(payload).expect(400);
        },
      );
    });

    describe('announcements with no asset references', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentNoUploadedAssets,
              assets: [],
            },
          },
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: {
            ...validReplyNoUploadedAssets,
            content: {
              ...validContentNoUploadedAssets,
              assets: [],
            },
          },
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: {
            ...validUpdateNoUploadedAssets,
            content: {
              ...validContentNoUploadedAssets,
              assets: [],
            },
          },
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
          payload: {
            profile: {
              ...validProfileNoUploadedAssets,
            },
          },
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
          payload: () => ({
            content: {
              ...validContentNoUploadedAssets,
              assets: [
                {
                  name: 'image asset',
                  references: uploadedAssetIds.map((referenceId) => ({ referenceId, height: 123, width: 321 })),
                },
              ],
            },
          }),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: () => ({
            ...validReplyNoUploadedAssets,
            content: {
              ...validContentNoUploadedAssets,
              assets: [
                {
                  name: 'image asset',
                  references: uploadedAssetIds.map((referenceId) => ({ referenceId, height: 123, width: 321 })),
                },
              ],
            },
          }),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: () => ({
            ...validUpdateNoUploadedAssets,
            content: {
              ...validContentNoUploadedAssets,
              assets: [
                {
                  name: 'image asset',
                  references: uploadedAssetIds.map((referenceId) => ({ referenceId, height: 123, width: 321 })),
                },
              ],
            },
          }),
        },
        {
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: () => validReaction,
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: () => ({
            profile: {
              ...validProfileNoUploadedAssets,
              icon: uploadedAssetIds.map((referenceId) => ({ referenceId, height: 123, width: 321 })),
            },
          }),
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
});
