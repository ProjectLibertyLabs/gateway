/* eslint-disable no-undef */
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { ApiModule } from '../src/api.module';
import { validContentNoUploadedAssets, validReplyNoUploadedAssets, validOnChainContent } from './mockRequestData';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';

const randomString = (length: number, _unused) =>
  randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

validOnChainContent.payload = randomString(1024, null);

describe('AppController E2E v2 asset upload verification', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApiModule],
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
  });
  it('valid request with uploaded assets should work!', async () => {
    const file = Buffer.from('h'.repeat(30 * 1000 * 1000)); // 30MB
    const response = await request(app.getHttpServer())
      .post(`/v2/asset/upload`)
      .attach('files', file, 'file1.jpg')
      .expect(202);
    await sleep(1000);
    const validReplyWithUploadedAssets = {
      ...validReplyNoUploadedAssets,
      content: {
        ...validContentNoUploadedAssets,
        assets: [
          {
            name: 'image asset',
            references: [
              {
                referenceId: response.body.assetIds[0],
                height: 123,
                width: 321,
              },
            ],
          },
        ],
      },
    };
    return request(app.getHttpServer())
      .post(`/v2/content/123/reply`)
      .send(validReplyWithUploadedAssets)
      .expect(202)
      .expect((res) => expect(res.text).toContain('referenceId'));
  }, 15000);
});
