/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ApiModule } from '../src/api.module';

describe('Account Controller', () => {
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

  it('(GET) /accounts/:msaId with valid msaId and no handle', async () => {
    const validMsaId = '3';
    await request(app.getHttpServer()).get(`/accounts/${validMsaId}`).expect(200).expect({
      msaId: '3',
      handle: null,
    });
  });

  it('(GET) /accounts/:msaId with invalid msaId', async () => {
    const invalidMsaId = 10;
    await request(app.getHttpServer())
      .get(`/accounts/${invalidMsaId}`)
      .expect(400)
      .expect({ statusCode: 400, message: 'Failed to find the account' });
  });

  it('(GET) /accounts/:msaId with valid msaId and handle', async () => {
    const validMsaId = 1;
    await request(app.getHttpServer())
      .get(`/accounts/${validMsaId}`)
      .expect(200)
      .expect((res) => res.body.msaId === '1')
      .expect((res) => res.body.handle.baseHandle === 'AliceHandle')
      .expect((res) => res.body.handle.canonicalBase === 'a11cehand1e');
  });
});
