/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';

describe('AppController E2E request verification!', () => {
  let app: INestApplication;
  let module: TestingModule;
  const validlocation = {
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
  const validContent = {
    content: 'test broadcast message',
    published: '1970-01-01T00:00:00+00:00',
    assets: [
      {
        type: 'image',
        name: 'image asset',
        references: [
          {
            referenceId: 'reference-id-1',
            height: 123,
            width: 321,
          },
        ],
      },
      {
        type: 'link',
        name: 'link asset',
        href: 'http://example.com',
      },
    ],
    name: 'name of note content',
    tag: validTags,
    location: validlocation,
  };
  const validBroadCast = {
    content: validContent,
  };
  const validReply = {
    content: validContent,
    inReplyTo: 'dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  };
  const validReaction = {
    emoji: '🤌🏼',
    apply: 5,
    inReplyTo: 'dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  };
  const validProfile = {
    icon: [
      {
        referenceId: 'reference-id-1',
        height: 123,
        width: 321,
      },
    ],
    summary: 'profile summary',
    published: '1970-01-01T00:00:00+00:00',
    name: 'name of profile content',
    tag: validTags,
    location: validlocation,
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
        .send(validBroadCast)
        .expect(400)
        .expect((res) => expect(res.text).toContain('must be a number string'));
    });

    it('invalid DsnpContentHashParam should fail', () => {
      const invalidContentHashParam = '2gsjhdaj';
      return request(app.getHttpServer())
        .delete(`/api/content/123/${invalidContentHashParam}`)
        .expect(400)
        .expect((res) => expect(res.text).toContain('must be in hexadecimal format'));
    });
  });

  describe('(POST) /api/content/:dsnpUserId/broadcast', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/broadcast`)
        .send(validBroadCast)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('empty body should fail', () => {
      const body = {};
      return request(app.getHttpServer())
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
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
        .post(`/api/content/123/broadcast`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('name must be longer than or equal to 1 characters'));
    });
  });

  describe('(POST) /api/content/:dsnpUserId/reply', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reply`)
        .send(validReply)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('empty body should fail', () => {
      const body = {};
      return request(app.getHttpServer())
        .post(`/api/content/123/reply`)
        .send(body)
        .expect(400)
        .expect((res) => expect(res.text).toContain('should not be empty'));
    });

    it('empty inReplyTo should fail', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reply`)
        .send({
          content: validContent,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('inReplyTo must be a string')));

    it('invalid inReplyTo should fail', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reply`)
        .send({
          content: validContent,
          inReplyTo: 'shgdjas72gsjajasa',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('inReplyTo must match')));
  });

  describe('(POST) /api/content/:dsnpUserId/reaction', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reaction`)
        .send(validReaction)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('valid emoji should fail', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reaction`)
        .send({
          emoji: '2',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('emoji must match')));

    it('valid apply amount should fail', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reaction`)
        .send({
          emoji: '😀',
          apply: -1,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('apply must not be less than 0')));

    it('invalid inReplyTo should fail', () =>
      request(app.getHttpServer())
        .post(`/api/content/123/reaction`)
        .send({
          emoji: '😀',
          apply: 0,
          inReplyTo: 'shgdjas72gsjajasa',
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('inReplyTo must match')));
  });

  describe('(PUT) /api/content/:dsnpUserId/:contentHash', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .put(`/api/content/123/0x7653423447AF`)
        .send({
          targetAnnouncementType: 'broadcast',
          content: validContent,
        })
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('invalid targetAnnouncementType should fail', () =>
      request(app.getHttpServer())
        .put(`/api/content/123/0x7653423447AF`)
        .send({
          targetAnnouncementType: 'invalid',
          content: validContent,
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('targetAnnouncementType must be one of the following values')));
  });

  describe('(DELETE) /api/content/:dsnpUserId/contentHash', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .delete(`/api/content/123/0x7653423447AF`)
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));
  });

  describe('(PUT) /api/profile/:userDsnpId', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .put(`/api/profile/123`)
        .send({
          profile: validProfile,
        })
        .expect(202)
        .expect((res) => expect(res.text).toContain('referenceId')));

    it('empty profile should fail', () =>
      request(app.getHttpServer())
        .put(`/api/profile/123`)
        .send({})
        .expect(400)
        .expect((res) => expect(res.text).toContain('should not be empty')));

    it('invalid published should fail', () =>
      request(app.getHttpServer())
        .put(`/api/profile/123`)
        .send({
          profile: {
            published: '1980',
          },
        })
        .expect(400)
        .expect((res) => expect(res.text).toContain('published must match')));

    it('non unique reference ids should fail', () =>
      request(app.getHttpServer())
        .put(`/api/profile/123`)
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

  describe('(PUT) /api/asset/upload', () => {
    it('valid request should work!', () =>
      request(app.getHttpServer())
        .put(`/api/asset/upload`)
        .attach('files', Buffer.from(validContent.toString()), 'image.jpg')
        .expect(202)
        .expect((res) => expect(res.text).toContain('assetIds')));

    it('invalid mime should fail', () =>
      request(app.getHttpServer())
        .put(`/api/asset/upload`)
        .attach('files', Buffer.from(validContent.toString()), 'doc.txt')
        .expect(422)
        .expect((res) => expect(res.text).toContain('expected type is')));
  });

  afterEach(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  });
});
