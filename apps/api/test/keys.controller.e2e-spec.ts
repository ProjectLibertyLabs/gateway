/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ApiModule } from '../src/api.module';

describe('Keys Controller', () => {
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

  it('(GET) /keys/:msaId with valid msaId', async () => {
    const validMsaId = '2';
    await request(app.getHttpServer())
      .get(`/keys/${validMsaId}`)
      .expect(200)
      .expect(['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty']);
  });

  it('(GET) /keys/:msaId with invalid msaId', async () => {
    const invalidMsaId = 10;
    await request(app.getHttpServer())
      .get(`/keys/${invalidMsaId}`)
      .expect(400)
      .expect({ statusCode: 400, message: 'Failed to find public keys for the given msaId' });
  });
});
