/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomFill } from 'crypto';
import { ApiModule } from '../src/api.module';
import {
  validBroadCastNoUploadedAssets,
  validContentNoUploadedAssets,
  validProfileNoUploadedAssets,
  validReaction,
  validReplyNoUploadedAssets,
} from './mockRequestData';

describe('AppController E2E request verification!', () => {
  let app: INestApplication;
  let module: TestingModule;
  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  it('(GET) /healthz', () =>
    request(app.getHttpServer()).get('/healthz').expect(200).expect({ status: 200, message: 'Service is healthy' }));

  it('(GET) /livez', () =>
    request(app.getHttpServer()).get('/livez').expect(200).expect({ status: 200, message: 'Service is live' }));

  it('(GET) /readyz', () =>
    request(app.getHttpServer()).get('/readyz').expect(200).expect({ status: 200, message: 'Service is ready' }));

  describe('Validate Route params', () => {
    it('invalid userDsnpId should fail', async () => {
      const invalidDsnpUserId = '2gsjhdaj';
      return request(app.getHttpServer())
        .post(`/v1/content/${invalidDsnpUserId}/broadcast`)
        .send(validBroadCastNoUploadedAssets)
        .expect(400)
        .expect((res) => expect(res.text).toContain('must be a number string'));
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
              type: 'image',
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
        .expect((res) => expect(res.text).toContain('published must match'));
    });

    it('invalid published should fail', () => {
      const body2 = {
        content: {
          content: 'tests content',
          published: '1980',
        },
      };
      return request(app.getHttpServer())
        .post(`/v1/content/123/broadcast`)
        .send(body2)
        .expect(400)
        .expect((res) => expect(res.text).toContain('published must match'));
    });

    it('invalid assets type should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          assets: [
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

    it('image asset without references should fail', () => {
      const body = {
        content: {
          content: 'test broadcast message',
          published: '1970-01-01T00:00:00+00:00',
          assets: [
            {
              type: 'image',
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
              type: 'image',
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
              type: 'link',
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
              type: 'link',
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
        .expect((res) => expect(res.text).toContain('mentionedId must be longer than or equal to 1 character'));
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
              type: 'image',
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
        .expect((res) => expect(res.text).toContain('inReplyTo must be a string')));

    it('invalid inReplyTo should fail', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reply`)
        .send({
          content: validContentNoUploadedAssets,
          inReplyTo: 'shgdjas72gsjajasa',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('inReplyTo must match')));
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

    it('valid apply amount should fail', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reaction`)
        .send({
          emoji: '😀',
          apply: -1,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('apply must not be less than 0')));

    it('invalid inReplyTo should fail', () =>
      request(app.getHttpServer())
        .post(`/v1/content/123/reaction`)
        .send({
          emoji: '😀',
          apply: 0,
          inReplyTo: 'shgdjas72gsjajasa',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('inReplyTo must match')));
  });

  describe('(PUT) /v1/content/:dsnpUserId', () => {
    it('valid request without assets should work!', () =>
      request(app.getHttpServer())
        .put(`/v1/content/123`)
        .send({
          targetContentHash: '0x7653423447AF',
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
      };
      return request(app.getHttpServer())
        .put(`/v1/content/123`)
        .send({
          targetContentHash: '0x7653423447AF',
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
            type: 'image',
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
        .expect((res) => expect(res.text).toContain(`${badAssetCid} does not exist`));
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
        .expect((res) => expect(res.text).toContain('targetContentHash must be in hexadecimal format!')));
  });

  describe('(DELETE) /v1/content/:dsnpUserId', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .delete(`/v1/content/123`)
        .send({
          targetContentHash: '0x7653423447AF',
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
        .expect((res) => expect(res.text).toContain('targetContentHash must be in hexadecimal format!')));
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
            published: '1980',
          },
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('published must match')));

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
      randomFill(buffer, (err, buf) => {
        if (err) throw err;
      });
      const response = await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', Buffer.from(buffer), 'file1.jpg')
        .expect(202);
      const assetId = response.body.assetIds[0];
      await sleep(2000);
      return request(app.getHttpServer())
        .get(`/v1/dev/asset/${assetId}`)
        .expect(200)
        .expect((res) => expect(Buffer.from(res.body)).toEqual(Buffer.from(buffer)));
    }, 15000);

    it('not uploaded asset should return not found', async () => {
      const assetId = 'bafybeieva67sj7hiiywi4kxsamcc2t2y2pptni2ki6gu63azj3pkznbzna';
      return request(app.getHttpServer()).get(`/v1/dev/asset/${assetId}`).expect(404);
    });
  });

  afterEach(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  }, 15000);
});
