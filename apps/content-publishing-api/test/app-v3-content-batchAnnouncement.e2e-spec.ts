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

    it('should accept valid files with matching schema IDs', async () => {
      const imageContent = Buffer.from('fake image content');

      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', imageContent, { filename: 'test.jpg', contentType: 'image/jpeg' })
        .field('schemaId', '12')
        .expect(202)
        .expect((res) => {
          expect(res.body).toHaveProperty('files');
          expect(Array.isArray(res.body.files)).toBe(true);
          expect(res.body.files.length).toBeGreaterThan(0);
          expect(res.body.files[0]).toHaveProperty('referenceId');
        });
    }, 30000);

    it('should process multiple files in a single request', async () => {
      const file1 = Buffer.from('fake image content 1');
      const file2 = Buffer.from('fake image content 2');

      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', file1, { filename: 'test1.jpg', contentType: 'image/jpeg' })
        .attach('files', file2, { filename: 'test2.png', contentType: 'image/png' })
        .field('schemaId', '12')
        .field('schemaId', '12')
        .expect(202)
        .expect((res) => {
          expect(res.body).toHaveProperty('files');
          expect(Array.isArray(res.body.files)).toBe(true);
          expect(res.body.files.length).toBe(2);
          expect(res.body.files[0]).toHaveProperty('referenceId');
          expect(res.body.files[1]).toHaveProperty('referenceId');
        });
    }, 30000);

    it('should handle mixed success and failure scenarios', async () => {
      // Mock the ApiService to simulate failure for files with specific content
      const apiService = app.get(ApiService);

      // Mock to fail uploads for files with "fail" in the filename
      jest.spyOn(apiService, 'uploadStreamedAsset').mockImplementation(async (stream, filename) => {
        // Consume the stream to prevent hanging
        const chunks: any[] = [];
        // Convert async iterable to array to avoid for-await-of loop
        const streamIterator = stream[Symbol.asyncIterator]();
        let result = await streamIterator.next();
        while (!result.done) {
          chunks.push(result.value);
          result = await streamIterator.next();
        }

        if (filename.includes('fail')) {
          return { error: 'Simulated upload failure' };
        }
        // For non-failing files, return a successful response
        return { cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' };
      });

      const successFile = Buffer.from('fake image content success');
      const failFile = Buffer.from('fake image content fail');

      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', successFile, { filename: 'success.jpg', contentType: 'image/jpeg' })
        .attach('files', failFile, { filename: 'fail.png', contentType: 'image/png' })
        .field('schemaId', '12')
        .field('schemaId', '12')
        .expect(207) // Multi-Status for partial success
        .expect((res) => {
          expect(res.body).toHaveProperty('files');
          expect(Array.isArray(res.body.files)).toBe(true);
          expect(res.body.files.length).toBe(2);

          // First file should succeed
          expect(res.body.files[0]).toHaveProperty('referenceId');
          expect(res.body.files[0]).toHaveProperty('cid');
          expect(res.body.files[0]).not.toHaveProperty('error');

          // Second file should fail
          expect(res.body.files[1]).toHaveProperty('error');
          expect(res.body.files[1].error).toBe('Simulated upload failure');
          expect(res.body.files[1]).not.toHaveProperty('referenceId');
          expect(res.body.files[1]).not.toHaveProperty('cid');
        });
    }, 30000);

    it('should handle batch announcement failures after successful uploads', async () => {
      // Mock the ApiService methods
      const apiService = app.get(ApiService);

      // Mock successful upload but failed batch creation
      jest.spyOn(apiService, 'uploadStreamedAsset').mockImplementation(async (stream) => {
        // Consume the stream to prevent hanging
        const chunks: any[] = [];
        const streamIterator = stream[Symbol.asyncIterator]();
        let result = await streamIterator.next();
        while (!result.done) {
          chunks.push(result.value);
          result = await streamIterator.next();
        }
        return { cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' };
      });

      jest.spyOn(apiService, 'enqueueBatchRequest').mockRejectedValue(new Error('Batch creation failed'));

      const file = Buffer.from('fake image content');

      await request(app.getHttpServer())
        .post('/v3/content/batchAnnouncement')
        .attach('files', file, { filename: 'test.jpg', contentType: 'image/jpeg' })
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
