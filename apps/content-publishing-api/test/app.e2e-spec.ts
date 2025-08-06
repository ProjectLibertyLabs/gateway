/* eslint-disable no-undef */
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes, randomFill } from 'crypto';
import { ApiModule } from '../src/api.module';
import {
  validBroadCastNoUploadedAssets,
  validContentNoUploadedAssets,
  validProfileNoUploadedAssets,
  validReaction,
  validReplyNoUploadedAssets,
  validOnChainContent,
} from './mockRequestData';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, PinoLogger } from 'nestjs-pino';
import {
  CONFIGURED_QUEUE_NAMES_PROVIDER,
  CONFIGURED_QUEUE_PREFIX_PROVIDER,
  ContentPublishingQueues as QueueConstants,
} from '#types/constants';
import { getPinoHttpOptions } from '#logger-lib';

const randomString = (length: number, _unused) =>
  randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

validOnChainContent.payload = randomString(1024, null);

describe('AppController E2E request verification!', () => {
  let app: NestExpressApplication;
  let module: TestingModule;

  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  describe('Validate Route params', () => {
    it('invalid userDsnpId should fail', async () => {
      const invalidDsnpUserId = '2gsjhdaj';
      return request(app.getHttpServer())
        .post(`/v1/content/${invalidDsnpUserId}/broadcast`)
        .send(validBroadCastNoUploadedAssets)
        .expect(400)
        .expect((res) => expect(res.text).toContain('should be a valid positive number'));
    });
  });

  describe('(POST) /v1/content/:dsnpUserId/broadcast', () => {
    it('valid request without uploaded assets should work!', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(validBroadCastNoUploadedAssets)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('valid broadcast request with uploaded assets should work!', async () => {
      const file = Buffer.from('g'.repeat(30 * 1000 * 1000)); // 30MB
      const response = await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', file, 'file1.jpg')
        .expect(202);
      await sleep(1000);
      const validBroadCastWithUploadedAssets = {
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
        .post(`/v1/content/123/broadcast`)
        .send(validBroadCastWithUploadedAssets)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId'));
    }, 15000);

    it('request with not uploaded assets should fail!', async () => {
      const badAssetCid = 'bafybeiap642764aat6txaap4qex4empkdtpjv7uabv47w1pdih3nflajpy';
      const validBroadCastWithUploadedAssets = {
        content: {
          ...validContentNoUploadedAssets,
          assets: [
            {
              name: 'image asset',
              references: [
                {
                  referenceId: badAssetCid,
                },
              ],
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(validBroadCastWithUploadedAssets)
        .expect(400)
        .expect((res) => expect(res.text).toContain(`${badAssetCid} does not exist`));
    });

    it('empty body should fail', () => {
      const body = {};
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('should not be empty'));
    });

    it('empty content should fail', () => {
      const body = {
        content: {
          content: '',
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('content must be longer than or equal to 1 characters'));
    });

    it('empty published should fail', () => {
      const body = {
        content: {
          content: 'tests content',
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('must be a valid ISO 8601 date string'));
    });

    it('invalid published should fail', () => {
      const body2 = {
        content: {
          content: 'tests content',
          published: 'invalid-date',
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body2)
        .expect(400)
        .expect((res) => expect(res.text).toContain('content.published must be a valid ISO 8601 date string'));
    });

    it('image asset without references should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          assets: [
            {
              isLink: false,
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('references should not be empty'));
    });

    it('image asset with non unique references id should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          assets: [
            {
              references: [
                {
                  referenceId: 'reference-id-1',
                },
                {
                  referenceId: 'reference-id-1',
                },
              ],
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('elements must be unique'));
    });

    it('link asset without href should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          assets: [
            {
              isLink: true,
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('href must be longer than or equal to 1 character'));
    });

    it('link asset with invalid href protocol should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          assets: [
            {
              isLink: true,
              href: 'ftp://sgdjas8912yejc.com',
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('href must be a URL address'));
    });

    it('hashtag without name should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          tag: [
            {
              type: 'hashtag',
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('name must be longer than or equal to 1 character'));
    });

    it('mentioned tag without mentionedId should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          tag: [
            {
              type: 'mention',
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('Invalid DSNP User URI'));
    });

    it('invalid tag type should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          tag: [
            {
              type: 'invalid',
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('type must be one of the following values'));
    });

    it('location with invalid units should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          location: {
            name: 'name of location',
            units: 'invalid',
          },
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('units must be one of the following values'));
    });

    it('location with empty name should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          location: {
            name: '',
          },
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('name must be longer than or equal to 1 characters'));
    });
  });

  describe('(POST) /v1/content/:dsnpUserId/reply', () => {
    it('valid request without assets should work!', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reply`)
        .send(validReplyNoUploadedAssets)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('valid request with uploaded assets should work!', async () => {
      const file = Buffer.from('h'.repeat(30 * 1000 * 1000)); // 30MB
      const response = await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
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
        .post(`/v1/content/123/reply`)
        .send(validReplyWithUploadedAssets)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId'));
    }, 15000);

    it('request with not uploaded assets should fail!', async () => {
      const badAssetCid = 'bafybeiap642764aat6txaap4qex4empkdtpjv7uabv47w1pdih3nflajpy';
      const validReplyWithUploadedAssets = {
        ...validReplyNoUploadedAssets,
        content: {
          ...validContentNoUploadedAssets,
          assets: [
            {
              name: 'image asset',
              references: [
                {
                  referenceId: badAssetCid,
                  height: 123,
                  width: 321,
                },
              ],
            },
          ],
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/reply`)
        .send(validReplyWithUploadedAssets)
        .expect(400)
        .expect((res) => expect(res.text).toContain(`${badAssetCid} does not exist`));
    });

    it('empty body should fail', () => {
      const body = {};
      return request(app.getHttpServer())
        .post(`/v1/content/123/reply`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('should not be empty'));
    });

    it('empty inReplyTo should fail', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reply`)
        .send({
          content: validContentNoUploadedAssets,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('inReplyTo should be a valid DsnpContentURI')));

    it('invalid inReplyTo should fail', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reply`)
        .send({
          content: validContentNoUploadedAssets,
          inReplyTo: 'shgdjas72gsjajasa',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('inReplyTo should be a valid DsnpContentURI')));
  });

  describe('(POST) /v1/content/:dsnpUserId/reaction', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reaction`)
        .send(validReaction)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('valid emoji should fail', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reaction`)
        .send({
          emoji: '2',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('emoji must match')));

    it('invalid apply amount should fail', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reaction`)
        .send({
          emoji: '😀',
          apply: -1,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('apply should be a number between 0 and 255')));

    it('invalid inReplyTo should fail', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reaction`)
        .send({
          emoji: '😀',
          apply: 0,
          inReplyTo: 'shgdjas72gsjajasa',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('inReplyTo should be a valid DsnpContentURI')));
  });

  describe('(PUT) /v1/content/:dsnpUserId', () => {
    it('valid request without assets should work!', () =>
      request(app.getHttpServer())
        .put(`/v1/content/123`)
        .send({
          targetContentHash: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
          targetAnnouncementType: 'broadcast',
          content: validContentNoUploadedAssets,
        })
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('valid request with uploaded assets should work!', async () => {
      const file = Buffer.from('g'.repeat(30 * 1000 * 1000)); // 30MB
      const response = await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', file, 'file1.jpg')
        .expect(202);
      await sleep(1000);
      const validContentWithUploadedAssets = {
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
      };
      return request(app.getHttpServer())
        .put(`/v1/content/123`)
        .send({
          targetContentHash: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
          targetAnnouncementType: 'broadcast',
          content: validContentWithUploadedAssets,
        })
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId'));
    }, 15000);

    it('request with not uploaded assets should fail!', async () => {
      const badAssetCid = 'bafybeiap642764aat6txaap4qex4empkdtpjv7uabv47w1pdih3nflajpy';
      const validBroadCastWithUploadedAssets = {
        ...validContentNoUploadedAssets,
        assets: [
          {
            name: 'image asset',
            references: [
              {
                referenceId: badAssetCid,
              },
            ],
          },
        ],
      };
      return request(app.getHttpServer())
        .put(`/v1/content/123`)
        .send({
          targetContentHash: '0x7653423447AF',
          targetAnnouncementType: 'broadcast',
          content: validBroadCastWithUploadedAssets,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('targetContentHash should be a valid DsnpContentHash'));
    });

    it('invalid targetAnnouncementType should fail', () =>
      request(app.getHttpServer())
        .put(`/v1/content/123`)
        .send({
          targetContentHash: '0x7653423447AF',
          targetAnnouncementType: 'invalid',
          content: validContentNoUploadedAssets,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('targetAnnouncementType must be one of the following values')));

    it('invalid targetContentHash should fail', () =>
      request(app.getHttpServer())
        .put(`/v1/content/123`)
        .send({
          targetContentHash: '6328462378',
          targetAnnouncementType: 'reply',
          content: validContentNoUploadedAssets,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('targetContentHash should be a valid DsnpContentHash')));
  });

  describe('(DELETE) /v1/content/:dsnpUserId', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .delete(`/v1/content/123`)
        .send({
          targetContentHash: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
          targetAnnouncementType: 'reply',
        })
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('invalid targetAnnouncementType should fail', () =>
      request(app.getHttpServer())
        .delete(`/v1/content/123`)
        .send({
          targetContentHash: '0x7653423447AF',
          targetAnnouncementType: 'invalid',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('targetAnnouncementType must be one of the following values')));

    it('invalid targetContentHash should fail', () =>
      request(app.getHttpServer())
        .delete(`/v1/content/123`)
        .send({
          targetContentHash: '6328462378',
          targetAnnouncementType: 'reply',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('targetContentHash should be a valid DsnpContentHash')));
  });

  describe('(POST) /v2/content/:dsnpUserId/tombstones', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .post(`/v2/content/123/tombstones`)
        .send({
          targetContentHash: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
          targetAnnouncementType: 'reply',
        })
        .expect((res) => console.log(res.text))
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('invalid targetAnnouncementType should fail', () =>
      request(app.getHttpServer())
        .post(`/v2/content/123/tombstones`)
        .send({
          targetContentHash: '0x7653423447AF',
          targetAnnouncementType: 'invalid',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('targetAnnouncementType must be one of the following values')));

    it('invalid targetContentHash should fail', () =>
      request(app.getHttpServer())
        .post(`/v2/content/123/tombstones`)
        .send({
          targetContentHash: '6328462378',
          targetAnnouncementType: 'reply',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('targetContentHash should be a valid DsnpContentHash')));
  });

  describe('(PUT) /v1/profile/:userDsnpId', () => {
    it('valid request without assets should work!', () =>
      request(app.getHttpServer())
        .put(`/v1/profile/123`)
        .send({
          profile: validProfileNoUploadedAssets,
        })
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('valid request with uploaded assets should work!', async () => {
      const file = Buffer.from('n'.repeat(30 * 1000 * 1000)); // 30MB
      const response = await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', file, 'file.jpg')
        .expect(202);
      await sleep(1000);
      const validUploadWithUploadedAssets = {
        ...validProfileNoUploadedAssets,
        icon: [
          {
            referenceId: response.body.assetIds[0],
            height: 123,
            width: 321,
          },
        ],
      };
      return request(app.getHttpServer())
        .put(`/v1/profile/123`)
        .send({
          profile: validUploadWithUploadedAssets,
        })
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId'));
    }, 15000);

    it('request with not uploaded icon should fail!', async () => {
      const badAssetCid = 'bafybeiap642764aat6txaap4qex4empkdtpjv7uabv47w1pdih3nflajpy';
      const validUploadWithUploadedAssets = {
        ...validProfileNoUploadedAssets,
        icon: [
          {
            referenceId: badAssetCid,
            height: 123,
            width: 321,
          },
        ],
      };
      return request(app.getHttpServer())
        .put(`/v1/profile/123`)
        .send({
          profile: validUploadWithUploadedAssets,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain(`${badAssetCid} does not exist`));
    });

    it('request with non-image uploaded assets should fail!', async () => {
      const file = Buffer.from('s'.repeat(30 * 1000 * 1000)); // 30MB
      const response = await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', file, 'file.mp3')
        .expect(202);
      await sleep(1000);
      const profileContent = {
        ...validProfileNoUploadedAssets,
        icon: [
          {
            referenceId: response.body.assetIds[0],
            height: 123,
            width: 321,
          },
        ],
      };
      return request(app.getHttpServer())
        .put(`/v1/profile/123`)
        .send({
          profile: profileContent,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('is not an image!'));
    }, 15000);

    it('empty profile should fail', () =>
      request(app.getHttpServer())
        .put(`/v1/profile/123`)
        .send({})
        .expect(400)
        .expect((res) => expect(res.text).toContain('should not be empty')));

    it('invalid published should fail', () =>
      request(app.getHttpServer())
        .put(`/v1/profile/123`)
        .send({
          profile: {
            published: 'invalid-date',
          },
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('profile.published must be a valid ISO 8601 date string')));

    it('non unique reference ids should fail', () =>
      request(app.getHttpServer())
        .put(`/v1/profile/123`)
        .send({
          profile: {
            icon: [
              {
                referenceId: 'reference-id-1',
              },
              {
                referenceId: 'reference-id-1',
              },
            ],
          },
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('elements must be unique')));
  });

  describe('(PUT) /v1/asset/upload', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', Buffer.from(validContentNoUploadedAssets.toString()), 'image.jpg')
        .expect(202)
        .expect((res) => expect(res.text).toContain('assetIds')));

    it('invalid mime should fail', () =>
      request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', Buffer.from(validContentNoUploadedAssets.toString()), 'doc.txt')
        .expect(422)
        .expect((res) => expect(res.text).toContain('expected type is')));

    it('valid request should work!', async () => {
      const file1 = Buffer.from('a'.repeat(30 * 1000)); // 30KB
      const file2 = Buffer.from('t'.repeat(30 * 1000 * 1000)); // 30MB
      const file3 = Buffer.from('z'.repeat(100 * 1000 * 1000)); // 100MB
      await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', file1, 'file1.jpg')
        .attach('files', file2, 'file2.mp3')
        .attach('files', file3, 'file3.mpeg')
        .expect(202)
        .expect((res) => expect(res.text).toContain('assetIds'));
    }, 15000);

    it('upload asset should be uploaded to IPFS', async () => {
      const buffer = new Uint32Array(100 * 1000);
      randomFill(buffer, (err, _buf) => {
        if (err) throw err;
      });
      return request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', Buffer.from(buffer), 'file1.jpg')
        .expect(202);
    }, 15000);
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  }, 15000);
});
