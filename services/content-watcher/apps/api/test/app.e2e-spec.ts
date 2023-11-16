/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';

describe('Content Publishing E2E request verification!', () => {
  let app: INestApplication;
  let module: TestingModule;
  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const validLocation = {
    name: 'name of location',
    accuracy: 97,
    altitude: 10,
    latitude: 37.26,
    longitude: -119.59,
    radius: 10,
    units: 'm',
  };
  const validTags = [
    {
      type: 'mention',
      mentionedId: 'dsnp://78187493520',
    },
    {
      type: 'hashtag',
      name: '#taggedUser',
    },
  ];
  const validContentNoUploadedAssets = {
    content: 'test broadcast message',
    published: '1970-01-01T00:00:00+00:00',
    name: 'name of note content',
    assets: [
      {
        type: 'link',
        name: 'link asset',
        href: 'http://example.com',
      },
    ],
    tag: validTags,
    location: validLocation,
  };
  const validBroadCastNoUploadedAssets = {
    content: validContentNoUploadedAssets,
  };
  const validReplyNoUploadedAssets = {
    content: validContentNoUploadedAssets,
    inReplyTo: 'dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  };
  const validReaction = {
    emoji: '🤌🏼',
    apply: 5,
    inReplyTo: 'dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();
    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    app.useGlobalPipes(new ValidationPipe());
    app.enableShutdownHooks();
    await app.init();
  });

  it('(GET) /api/health', () => request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 200 }));

  describe('Validate Route params', () => {
    it('invalid userDsnpId should fail', async () => {
      const invalidDsnpUserId = '2gsjhdaj';
      return request(app.getHttpServer())
        .post(`/api/content/${invalidDsnpUserId}/broadcast`)
        .send(validBroadCastNoUploadedAssets)
        .expect(400)
        .expect((res) => expect(res.text).toContain('must be a number string'));
    });
  });

  describe('(POST) /api/content/:dsnpUserId/broadcast', () => {
    it('valid request without uploaded assets should work!', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/broadcast`)
        .send(validBroadCastNoUploadedAssets)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('valid broadcast request with uploaded assets should work!', async () => {
      const file = Buffer.from('g'.repeat(30 * 1000 * 1000)); // 30MB
      const response = await request(app.getHttpServer()).put(`/api/asset/upload`).attach('files', file, 'file1.jpg').expect(202);
      await sleep(1000);
      const validBroadCastWithUploadedAssets = {
        content: {
          ...validContentNoUploadedAssets,
          assets: [
            {
              type: 'image',
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
        .post(`/api/content/123/broadcast`)
        .send(validBroadCastWithUploadedAssets)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId'));
    }, 15000);
  });

  describe('(POST) /api/content/:dsnpUserId/reply', () => {
    it('valid request without assets should work!', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reply`)
        .send(validReplyNoUploadedAssets)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));
  });

  describe('(POST) /api/content/:dsnpUserId/reaction', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reaction`)
        .send(validReaction)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));
  });

  afterEach(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  }, 15000);
});
