/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import request from 'supertest';

describe('Handles Controller', () => {
  let app: INestApplication;
  let module: TestingModule;

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

  describe('Publishes Handle', () => {
    // TODO: once webhook is working, add to test so that we can check the data that comes back
    // potential cases: successful creation, handle already exists for msa, successful change, bad expiration, etc.

    it('(POST) /handles a creates new handle becuase handle exists', async () => {
      const accountId = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
      // NOTE: This test will fail if block height > 65
      const payload = {
        baseHandle: 'BobHandle',
        expiration: 65,
      };
      const proof =
        '0x28a23484d44be538e4ac41277bf48242765bb2fc51ecaef70d9a061aa1f5183a707f634ff5ee56b3209c3b04508458964c74b404a96652b5db4000435ef0418b';

      await request(app.getHttpServer())
        .post('/handles')
        .send({ accountId, payload, proof })
        .expect(200)
        .expect((req) => req.text === 'Handle created successfully');
    });

    it('(POST) /handles/change a provider changes the handle', async () => {
      const accountId = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
      // NOTE: This test will fail if block height > 65
      const payload = {
        baseHandle: 'BobHandleChanged',
        expiration: 65,
      };
      const proof =
        '0x0a37285a9af80fd8a20954f7cb5c4c8a883020ba6c8545012dcf36ace169f65810c096466d68073de55858b1d5cd7918477f0f28da8856aece2d1eb42fa3e08a';

      await request(app.getHttpServer())
        .post('/handles/change')
        .send({ accountId, payload, proof })
        .expect(200)
        .expect((req) => req.text === 'Handle created successfully');
    });
  });

  describe('Gets Handle', () => {
    it('(GET) /handles/:msaId with valid provider msaId', async () => {
      const validMsaId = 1;
      await request(app.getHttpServer())
        .get(`/handles/${validMsaId}`)
        .expect(200)
        .expect((res) => res.body.base_handle === 'AliceHandle')
        .expect((res) => res.body.canonical_base === 'a11cehand1e');
    });
    it('(GET) /handles/:msaId with valid delegator msaId', async () => {
      const validMsaId = 2;
      await request(app.getHttpServer())
        .get(`/handles/${validMsaId}`)
        .expect(200)
        .expect((res) => res.body.base_handle === 'BobHandle')
        .expect((res) => res.body.canonical_base === 'b0bhand1e');
    });
    it('(GET) /handles/:msaId with valid msaId, but undefined handle', async () => {
      const msaIdWithNoHandle = 3;
      await request(app.getHttpServer())
        .get(`/handles/${msaIdWithNoHandle}`)
        .expect(400)
        .expect({ statusCode: 400, message: 'Failed to find the handle.' });
    });
    it('(GET) /handles/:msaId with invalid msaId', async () => {
      const invalidMsaId = 10;
      await request(app.getHttpServer())
        .get(`/handles/${invalidMsaId}`)
        .expect(400)
        .expect({ statusCode: 400, message: 'Failed to find the handle.' });
    });
  });
});
