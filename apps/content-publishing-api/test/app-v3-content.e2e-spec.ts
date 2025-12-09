import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiModule } from '#content-publishing-api/api.module';
import { ApiService } from '../src/api.service';
import request from 'supertest';
import {
  CONFIGURED_QUEUE_NAMES_PROVIDER,
  CONFIGURED_QUEUE_PREFIX_PROVIDER,
  ContentPublishingQueues as QueueConstants,
} from '#types/constants';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { Logger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomFile30K } from './mockRequestData';

describe('AppController E2E request verification', () => {
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

  describe('(POST) /v3/content/batchAnnouncement', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should reject request without files', async () => {
      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .expect(400)
        .expect((res) => expect(res.text).toContain('No files provided'));
    }, 30000);

    // TODO:
    it.skip('endpoint should only accept max number of allowed files', async () => {
      let req = request(app.getHttpServer()).post('/v3/content/batchAnnouncement');
      for (const i of Array(11).keys()) {
        req = req.attach('files', randomFile30K, `file${i}.jpg`);
        req = req.field('schemaId', 1);
      }
      await req
        .expect(202)
        .expect((res) => expect(res.body.files.length).toBe(11))
        .expect((res) => expect(res.body.files[10].error).toMatch(/Max file upload count per request exceeded/));
    });

    it('file with MIME type not in whitelist should be rejected', async () => {
      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', randomFile30K, { filename: 'file.jpg', contentType: 'image/jpeg' })
        .attach('files', randomFile30K, { filename: 'file.parquet', contentType: 'application/vnd.apache.parquet' })
        .field('schemaId', 1)
        .field('schemaId', 1)
        .expect(207)
        .expect((res) => {
          expect(res.body.files[0].error).toMatch(/Unsupported file type/);
          expect(res.body.files[1].error).not.toBeDefined();
        });
    });

    // TODO: endpoint should validate schemaId
    it.skip.each([
      {
        description: 'non-numeric schemaId',
        schemaId: 'not a number',
        message: /schemaId should be a positive integer/,
      },
      {
        description: 'negative schemaId string',
        schemaId: '-1',
        message: /schemaId should be a positive integer/,
      },
      {
        description: 'schemaId too large',
        schemaId: 65536,
        message: /schemaId should not exceed 65535/,
      },
    ])('$description should fail', async ({ schemaId }) => {
      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', randomFile30K, { filename: 'file.parquet', contentType: 'application/vnd.apache.parquet' })
        .field('schemaId', schemaId)
        .expect(202)
        .expect((res) => expect(res.body.message).toMatch(/schemaId should be a positive integer/));
    });

    // TODO: App throws inside callback instead of returning correct error in body
    it.skip('file missing schemaId should fail', async () => {
      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', randomFile30K, { filename: 'file.parquet', contentType: 'application/vnd.apache.parquet' })
        .expect(202)
        .expect((res) => expect(res.body.files[0].error).toMatch(/Missing schemaId in request body/));
    });

    it('should accept valid file with matching schema ID', async () => {
      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', randomFile30K, { filename: 'file.parquet', contentType: 'application/vnd.apache.parquet' })
        .field('schemaId', '12')
        .expect(202)
        .expect((res) => {
          expect(res.body).toHaveProperty('files');
          expect(Array.isArray(res.body.files)).toBe(true);
          expect(res.body.files.length).toEqual(1);
          expect(res.body.files[0]).toHaveProperty('referenceId');
          expect(res.body.files[0]).toHaveProperty('cid');
        });
    }, 30000);

    it('should process multiple files in a single request', async () => {
      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', randomFile30K, { filename: 'test1.parquet', contentType: 'application/vnd.apache.parquet' })
        .attach('files', randomFile30K, { filename: 'test2.parquet', contentType: 'application/vnd.apache.parquet' })
        .field('schemaId', '12')
        .field('schemaId', '12')
        .expect(202)
        .expect((res) => {
          expect(res.body).toHaveProperty('files');
          expect(Array.isArray(res.body.files)).toBe(true);
          expect(res.body.files.length).toBe(2);
          expect(res.body.files[0]).toHaveProperty('referenceId');
          expect(res.body.files[0]).toHaveProperty('cid');
          expect(res.body.files[1]).toHaveProperty('referenceId');
          expect(res.body.files[1]).toHaveProperty('cid');
        });
    }, 30000);

    it('should handle mixed success and failure scenarios', async () => {
      // Mock the ApiService to simulate failure for files with specific content
      const apiService = app.get(ApiService);

      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', randomFile30K, { filename: 'file.parquet', contentType: 'application/vnd.apache.parquet' })
        .attach('files', randomFile30K, { filename: 'file.jpg', contentType: 'image/jpeg' })
        .field('schemaId', '12')
        .field('schemaId', '12')
        .expect(207) // Multi-Status for partial success
        .expect((res) => {
          expect(res.body).toHaveProperty('files');
          expect(Array.isArray(res.body.files)).toBe(true);
          expect(res.body.files.length).toBe(2);

          // Parquet should succeed
          expect(res.body.files[0]).toHaveProperty('referenceId');
          expect(res.body.files[0]).toHaveProperty('cid');
          expect(res.body.files[0]).not.toHaveProperty('error');

          // jpeg should fail
          expect(res.body.files[1]).toHaveProperty('error');
          expect(res.body.files[1].error).toMatch('Unsupported file type');
          expect(res.body.files[1]).not.toHaveProperty('referenceId');
          expect(res.body.files[1]).not.toHaveProperty('cid');
        });
    }, 30000);

    it('should handle batch announcement failures after successful uploads', async () => {
      // Mock the ApiService methods
      const apiService = app.get(ApiService);
      jest.spyOn(apiService, 'enqueueBatchRequest').mockRejectedValue(new Error('Batch creation failed'));

      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', randomFile30K, { filename: 'test.parquet', contentType: 'application/vnd.apache.parquet' })
        .field('schemaId', '12')
        .expect(207) // Multi-Status when batch creation fails after successful uploads
        .expect((res) => {
          expect(res.body).toHaveProperty('files');
          expect(Array.isArray(res.body.files)).toBe(true);
          expect(res.body.files.length).toBe(1);

          // Should have CID but error due to batch failure
          expect(res.body.files[0]).toHaveProperty('cid');
          expect(res.body.files[0]).toHaveProperty('error');
          expect(res.body.files[0].error).toBe('Upload to IPFS succeeded, but batch announcement to chain failed');
          expect(res.body.files[0]).not.toHaveProperty('referenceId');
        });

      // Restore the original method
    }, 30000);
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  }, 60000);
});
